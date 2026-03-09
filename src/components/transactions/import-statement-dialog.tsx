"use client";

import { useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UploadSimple,
  CircleNotch,
  WarningCircle,
  Check,
  Lightning,
  X,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  importTransactions,
  checkDuplicates,
  suggestTags,
  type TagSuggestion,
} from "@/app/(dashboard)/statement/actions";

interface ParsedRow {
  date: string;
  narration: string;
  ref_no: string;
  amount: number;
  balance: number | null;
}

function parseDate(raw: string): string | null {
  const parts = raw.toString().trim().split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yy] = parts;
  let year = yy;
  if (year.length === 2) year = `20${year}`;
  const d = new Date(`${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function parseXlsSheet(
  rows: unknown[][]
): { parsed: ParsedRow[]; errors: string[] } {
  const errors: string[] = [];
  const parsed: ParsedRow[] = [];

  // Find header row: scan for a row containing "Date" AND "Narration"
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const lower = row.map((c) => String(c ?? "").toLowerCase());
    if (
      lower.some((c) => c === "date") &&
      lower.some((c) => c.includes("narration"))
    ) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    errors.push("Could not find header row with Date and Narration columns");
    return { parsed, errors };
  }

  const headers = rows[headerIdx].map((c) =>
    String(c ?? "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
  );

  const dateIdx = headers.findIndex((h) => h === "date");
  const narrIdx = headers.findIndex((h) => h.includes("narration"));
  const debitIdx = headers.findIndex(
    (h) => h.includes("debit") || h.includes("withdrawal")
  );
  const creditIdx = headers.findIndex(
    (h) => h.includes("credit") || h.includes("deposit")
  );
  const balIdx = headers.findIndex(
    (h) => h.includes("closing balance") || h.includes("balance")
  );
  const refIdx = headers.findIndex(
    (h) => h.includes("chq") || h.includes("ref")
  );

  if (dateIdx === -1 || narrIdx === -1) {
    errors.push("Missing required Date or Narration columns");
    return { parsed, errors };
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length <= 1) continue;

    const rawDate = String(row[dateIdx] ?? "").trim();
    if (!rawDate || rawDate.startsWith("*")) continue;

    // Stop at footer markers
    const firstCell = String(row[0] ?? "").trim().toLowerCase();
    if (
      firstCell.includes("end of statement") ||
      firstCell.includes("generated on")
    )
      break;

    const date = parseDate(rawDate);
    if (!date) continue;

    const narration = String(row[narrIdx] ?? "").trim();
    const ref_no = refIdx >= 0 ? String(row[refIdx] ?? "").trim() : "";

    const debitRaw =
      debitIdx >= 0 ? String(row[debitIdx] ?? "").replace(/,/g, "") : "";
    const creditRaw =
      creditIdx >= 0 ? String(row[creditIdx] ?? "").replace(/,/g, "") : "";
    const debit = debitRaw ? parseFloat(debitRaw) : 0;
    const credit = creditRaw ? parseFloat(creditRaw) : 0;

    if (!debit && !credit) continue;

    const amount = credit > 0 ? credit : -debit;

    const balRaw =
      balIdx >= 0 ? String(row[balIdx] ?? "").replace(/,/g, "") : "";
    const balance = balRaw ? parseFloat(balRaw) : null;

    parsed.push({ date, narration, ref_no, amount, balance });
  }

  return { parsed, errors };
}

export function ImportStatementDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isChecking, setIsChecking] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [duplicateKeys, setDuplicateKeys] = useState<Set<string>>(new Set());
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [suggestions, setSuggestions] = useState<Record<string, TagSuggestion[]>>({});
  const [accepted, setAccepted] = useState<Record<string, TagSuggestion>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const makeKey = (r: { date: string; amount: number; narration: string }) =>
    `${r.date}|${r.amount}|${r.narration}`;

  const suggKey = (rowKey: string, s: TagSuggestion) =>
    `${rowKey}::${s.type}::${s.invoice_id ?? s.contractor_id ?? s.category}`;

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      setDuplicateKeys(new Set());

      try {
        const XLSX = await import("xlsx");

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          defval: "",
        });

        const { parsed: rows, errors } = parseXlsSheet(sheetRows);
        setParsed(rows);
        setParseErrors(errors);

        if (rows.length > 0) {
          setIsChecking(true);
          const [dupeResult, suggestResult] = await Promise.all([
            checkDuplicates(
              rows.map((r) => ({ date: r.date, amount: r.amount, narration: r.narration }))
            ),
            suggestTags(
              rows.map((r) => ({ date: r.date, amount: r.amount, narration: r.narration }))
            ).catch(() => ({ suggestions: {} as Record<string, TagSuggestion[]> })),
          ]);
          setDuplicateKeys(new Set(dupeResult.duplicateKeys));
          setSuggestions(suggestResult.suggestions);
          setIsChecking(false);
        }
      } catch {
        setParsed(null);
        setParseErrors([
          "Could not parse file. Please upload an HDFC bank statement (.xls)",
        ]);
      }
    },
    []
  );

  function acceptSuggestion(rowKey: string, suggestion: TagSuggestion) {
    const sk = suggKey(rowKey, suggestion);
    setAccepted((prev) => ({ ...prev, [sk]: suggestion }));
    setDismissed((prev) => {
      const next = new Set(prev);
      next.delete(sk);
      return next;
    });
  }

  function dismissSuggestion(rowKey: string, suggestion: TagSuggestion) {
    const sk = suggKey(rowKey, suggestion);
    setDismissed((prev) => new Set(prev).add(sk));
    setAccepted((prev) => {
      const next = { ...prev };
      delete next[sk];
      return next;
    });
  }

  function acceptAllSuggestions() {
    const allAccepted: Record<string, TagSuggestion> = {};
    for (const [rowKey, rowSuggs] of Object.entries(suggestions)) {
      for (const s of rowSuggs) {
        const sk = suggKey(rowKey, s);
        if (!dismissed.has(sk)) {
          allAccepted[sk] = s;
        }
      }
    }
    setAccepted(allAccepted);
  }

  const newRows = parsed?.filter((r) => !duplicateKeys.has(makeKey(r))) ?? [];
  const dupeCount = parsed ? parsed.length - newRows.length : 0;
  const suggestedCount = Object.keys(suggestions).filter(
    (key) => !duplicateKeys.has(key)
  ).length;

  function handleImport() {
    if (newRows.length === 0) return;
    startTransition(async () => {
      const rowsWithTags = newRows.map((row) => {
        const key = makeKey(row);
        const rowSuggs = suggestions[key] ?? [];
        let category: string | undefined;
        let invoice_id: number | undefined;
        let contractor_id: number | undefined;

        for (const s of rowSuggs) {
          const sk = suggKey(key, s);
          if (accepted[sk]) {
            if (s.category && !category) category = s.category;
            if (s.invoice_id) invoice_id = s.invoice_id;
            if (s.contractor_id) contractor_id = s.contractor_id;
          }
        }

        return { ...row, category, invoice_id, contractor_id };
      });

      const taggedCount = rowsWithTags.filter(
        (r) => r.category || r.invoice_id || r.contractor_id
      ).length;

      const result = await importTransactions(rowsWithTags, fileName);
      if (result.error) {
        toast.error(result.error);
      } else {
        const tagMsg = taggedCount > 0 ? ` (${taggedCount} auto-tagged)` : "";
        toast.success(`Imported ${result.count} transactions${tagMsg}`);
        setOpen(false);
        setParsed(null);
        setParseErrors([]);
        setDuplicateKeys(new Set());
        setSuggestions({});
        setAccepted({});
        setDismissed(new Set());
      }
    });
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setParsed(null);
      setParseErrors([]);
      setDuplicateKeys(new Set());
      setFileName("");
      setSuggestions({});
      setAccepted({});
      setDismissed(new Set());
    }
  }

  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UploadSimple className="mr-2 h-4 w-4" />
          Import Statement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import Bank Statement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 flex flex-col flex-1 min-h-0">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Upload an HDFC bank statement (.xls). The file should have Date,
              Narration, Withdrawal, Deposit, and Balance columns.
            </p>
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFile}
              className="text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {parseErrors.length > 0 && (
            <div className="rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-800 dark:text-orange-200">
                <WarningCircle className="h-4 w-4" />
                {parseErrors.length} warning(s)
              </div>
              <ul className="mt-1 text-xs text-orange-700 dark:text-orange-300 space-y-0.5">
                {parseErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {parseErrors.length > 5 && (
                  <li>... and {parseErrors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {isChecking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleNotch className="h-4 w-4 animate-spin" />
              Checking for duplicates and suggestions...
            </div>
          )}

          {parsed && parsed.length > 0 && !isChecking && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                <span>
                  {parsed.length} transactions found in{" "}
                  <strong>{fileName}</strong>
                  {dupeCount > 0 && (
                    <span className="text-muted-foreground">
                      {" "}&middot; {dupeCount} already imported
                    </span>
                  )}
                  {suggestedCount > 0 && (
                    <span className="text-muted-foreground">
                      {" "}&middot; {suggestedCount} with suggestions
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {" "}&middot; <strong>{newRows.length} new</strong>
                  </span>
                </span>
              </div>

              {suggestedCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lightning className="h-3 w-3" />
                    {suggestedCount} suggestion{suggestedCount !== 1 ? "s" : ""} available
                  </span>
                  <Button variant="ghost" size="sm" onClick={acceptAllSuggestions}>
                    Accept All Suggestions
                  </Button>
                </div>
              )}

              <div className="rounded-md border flex-1 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Narration</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Suggestion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.map((row, i) => {
                      const key = makeKey(row);
                      const isDupe = duplicateKeys.has(key);
                      const rowSuggs = suggestions[key] ?? [];
                      return (
                        <TableRow
                          key={i}
                          className={isDupe ? "opacity-40" : undefined}
                        >
                          <TableCell className="whitespace-nowrap text-xs">
                            {isDupe ? <s>{row.date}</s> : row.date}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-xs">
                            {isDupe ? (
                              <span className="flex items-center gap-1.5">
                                <s>{row.narration}</s>
                                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  Already imported
                                </span>
                              </span>
                            ) : (
                              row.narration
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right text-xs tabular-nums ${
                              isDupe
                                ? ""
                                : row.amount > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                            }`}
                          >
                            {isDupe ? (
                              <s>{fmt.format(row.amount)}</s>
                            ) : (
                              fmt.format(row.amount)
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {!isDupe && rowSuggs.length > 0 && (
                              <div className="flex flex-col gap-1">
                                {rowSuggs.map((s, si) => {
                                  const sk = suggKey(key, s);
                                  const isAccepted = !!accepted[sk];
                                  const isDismissed_ = dismissed.has(sk);
                                  if (isDismissed_) return null;
                                  return (
                                    <div key={si} className="flex items-center gap-1">
                                      <Badge
                                        variant={isAccepted ? "default" : "outline"}
                                        className={`text-[10px] ${
                                          isAccepted
                                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                            : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                        }`}
                                      >
                                        {s.type === "invoice"
                                          ? s.invoice_label
                                          : s.type === "contractor"
                                            ? `Salary → ${s.contractor_name}`
                                            : s.category}
                                      </Badge>
                                      {!isAccepted && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => acceptSuggestion(key, s)}
                                            className="rounded p-0.5 hover:bg-green-100 dark:hover:bg-green-900"
                                          >
                                            <Check className="h-3 w-3 text-green-600" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => dismissSuggestion(key, s)}
                                            className="rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900"
                                          >
                                            <X className="h-3 w-3 text-red-500" />
                                          </button>
                                        </>
                                      )}
                                      {isAccepted && (
                                        <Check className="h-3 w-3 text-green-600" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isPending || newRows.length === 0}
                >
                  {isPending && (
                    <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {newRows.length === 0
                    ? "All transactions already imported"
                    : `Import ${newRows.length} Transaction${newRows.length !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </>
          )}

          {parsed && parsed.length === 0 && !isChecking && (
            <p className="text-sm text-muted-foreground">
              No valid transactions found in the file.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
