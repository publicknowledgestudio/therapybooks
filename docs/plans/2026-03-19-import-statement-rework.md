# Import Statement Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the suggestion accept/dismiss bug, simplify to one-client-per-transaction, move tick/cross inside pills, add inline client search, and convert the import flow from a dialog to a full page.

**Architecture:** Replace the multi-suggestion `accepted`/`dismissed` state with a simple `selectedClient` map per row. Suggestion pills show inline accept/dismiss buttons. A Popover+Command combobox lets users search for any client. The entire import flow moves from `ImportStatementDialog` to a new page at `/statement/import`. A new `fetchClients` server action provides the client list for search.

**Tech Stack:** Next.js 15, Supabase, TypeScript, cmdk (Command component), Radix Popover

---

### Task 1: Add fetchClients server action

**Files:**
- Modify: `src/app/(dashboard)/statement/actions.ts`

**Step 1: Add fetchClients action**

At the end of `src/app/(dashboard)/statement/actions.ts`, add:

```typescript
export async function fetchClients(): Promise<
  Array<{ id: number; name: string }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("name");

  return data ?? [];
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/statement/actions.ts
git commit -m "feat: add fetchClients server action for import search"
```

---

### Task 2: Create the ClientPicker combobox component

**Files:**
- Create: `src/components/transactions/client-picker.tsx`

This is a Popover+Command combobox that shows suggestion pills with inline ✓/✕, plus a search input to find any client.

**Step 1: Create the component**

Create `src/components/transactions/client-picker.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, X, MagnifyingGlass } from "@/components/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface ClientOption {
  id: number;
  name: string;
}

interface ClientPickerProps {
  suggestions: ClientOption[];
  allClients: ClientOption[];
  selected: ClientOption | null;
  onSelect: (client: ClientOption | null) => void;
}

export function ClientPicker({
  suggestions,
  allClients,
  selected,
  onSelect,
}: ClientPickerProps) {
  const [open, setOpen] = useState(false);

  // If a client is already selected, show it as a green pill with ✕
  if (selected) {
    return (
      <Badge
        variant="default"
        className="inline-flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200"
      >
        {selected.name}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="ml-0.5 rounded-full hover:bg-green-200 dark:hover:bg-green-800"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Suggestion pills with inline ✓ / ✕ */}
      {suggestions.map((s) => (
        <Badge
          key={s.id}
          variant="outline"
          className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        >
          {s.name}
          <button
            type="button"
            onClick={() => onSelect(s)}
            className="rounded-full hover:bg-green-100 dark:hover:bg-green-900"
          >
            <Check className="h-3 w-3 text-green-600" />
          </button>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-full hover:bg-red-100 dark:hover:bg-red-900"
          >
            <X className="h-3 w-3 text-red-500" />
          </button>
        </Badge>
      ))}

      {/* Search trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
          >
            <MagnifyingGlass className="h-3 w-3" />
            Search
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search clients..." />
            <CommandList>
              <CommandEmpty>No clients found.</CommandEmpty>
              <CommandGroup>
                {allClients.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name}
                    onSelect={() => {
                      onSelect(c);
                      setOpen(false);
                    }}
                  >
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/transactions/client-picker.tsx
git commit -m "feat: add ClientPicker combobox with suggestion pills and search"
```

---

### Task 3: Create the import page

**Files:**
- Create: `src/app/(dashboard)/statement/import/page.tsx`

This replaces the dialog with a full page. It reuses the parsing logic from `import-statement-dialog.tsx` but uses the simplified one-client-per-row model and the new ClientPicker.

**Step 1: Create the page**

Create `src/app/(dashboard)/statement/import/page.tsx`:

```tsx
"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CaretLeft,
  UploadSimple,
  CircleNotch,
  WarningCircle,
  Check,
  Lightning,
} from "@/components/ui/icons";
import { toast } from "sonner";
import {
  importTransactions,
  checkDuplicates,
  suggestTags,
  fetchClients,
  type TagSuggestion,
} from "@/app/(dashboard)/statement/actions";
import { ClientPicker } from "@/components/transactions/client-picker";

interface ParsedRow {
  date: string;
  narration: string;
  ref_no: string;
  amount: number;
  balance: number | null;
}

interface ClientOption {
  id: number;
  name: string;
}

function parseDate(raw: string): string | null {
  const parts = raw.toString().trim().split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yy] = parts;
  let year = yy;
  if (year.length === 2) year = `20${year}`;
  const d = new Date(
    `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
  );
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function parseXlsSheet(
  rows: unknown[][]
): { parsed: ParsedRow[]; errors: string[] } {
  const errors: string[] = [];
  const parsed: ParsedRow[] = [];

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

export default function ImportStatementPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isChecking, setIsChecking] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [duplicateKeys, setDuplicateKeys] = useState<Set<string>>(new Set());
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");

  // Suggestions from server: rowKey -> ClientOption[]
  const [suggestions, setSuggestions] = useState<
    Record<string, ClientOption[]>
  >({});
  // User selection: rowKey -> ClientOption | null
  const [selectedClients, setSelectedClients] = useState<
    Record<string, ClientOption | null>
  >({});
  // All clients for search
  const [allClients, setAllClients] = useState<ClientOption[]>([]);

  const makeKey = (r: { date: string; amount: number; narration: string }) =>
    `${r.date}|${r.amount}|${r.narration}`;

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      setDuplicateKeys(new Set());
      setSuggestions({});
      setSelectedClients({});

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
          const [dupeResult, suggestResult, clientList] = await Promise.all([
            checkDuplicates(
              rows.map((r) => ({
                date: r.date,
                amount: r.amount,
                narration: r.narration,
              }))
            ),
            suggestTags(
              rows.map((r) => ({
                date: r.date,
                amount: r.amount,
                narration: r.narration,
              }))
            ).catch(() => ({
              suggestions: {} as Record<string, TagSuggestion[]>,
            })),
            fetchClients(),
          ]);

          setDuplicateKeys(new Set(dupeResult.duplicateKeys));
          setAllClients(clientList);

          // Convert TagSuggestion[] to ClientOption[] per row
          const clientSuggs: Record<string, ClientOption[]> = {};
          const autoSelected: Record<string, ClientOption | null> = {};
          for (const [rowKey, rowSuggs] of Object.entries(
            suggestResult.suggestions
          )) {
            const clients = rowSuggs
              .filter((s) => s.client_id && s.client_name)
              .map((s) => ({ id: s.client_id!, name: s.client_name! }));
            // Deduplicate by client id
            const unique = clients.filter(
              (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i
            );
            if (unique.length > 0) {
              clientSuggs[rowKey] = unique;
              // Auto-select if exactly one suggestion
              if (unique.length === 1) {
                autoSelected[rowKey] = unique[0];
              }
            }
          }
          setSuggestions(clientSuggs);
          setSelectedClients(autoSelected);
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

  function selectClient(rowKey: string, client: ClientOption | null) {
    setSelectedClients((prev) => ({ ...prev, [rowKey]: client }));
  }

  function acceptAllSuggestions() {
    const auto: Record<string, ClientOption | null> = { ...selectedClients };
    for (const [rowKey, clients] of Object.entries(suggestions)) {
      if (!auto[rowKey] && clients.length > 0) {
        auto[rowKey] = clients[0];
      }
    }
    setSelectedClients(auto);
  }

  const newRows =
    parsed?.filter((r) => !duplicateKeys.has(makeKey(r))) ?? [];
  const dupeCount = parsed ? parsed.length - newRows.length : 0;
  const suggestedCount = Object.keys(suggestions).filter(
    (key) => !duplicateKeys.has(key)
  ).length;

  function handleImport() {
    if (newRows.length === 0) return;
    startTransition(async () => {
      const rowsWithTags = newRows.map((row) => {
        const key = makeKey(row);
        const client = selectedClients[key];
        return {
          ...row,
          category: client ? "Client Payment" : undefined,
          client_id: client?.id,
        };
      });

      const taggedCount = rowsWithTags.filter((r) => r.client_id).length;

      const result = await importTransactions(rowsWithTags, fileName);
      if (result.error) {
        toast.error(result.error);
      } else {
        const tagMsg =
          taggedCount > 0 ? ` (${taggedCount} matched to clients)` : "";
        toast.success(`Imported ${result.count} transactions${tagMsg}`);
        router.push("/statement");
      }
    });
  }

  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/statement"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <CaretLeft className="size-4" />
          Bank Statement
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Import Statement
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload an HDFC bank statement (.xls) and review transactions before
          importing.
        </p>
      </div>

      {/* File upload */}
      <div className="mb-6">
        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFile}
          className="text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
        />
      </div>

      {parseErrors.length > 0 && (
        <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950">
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
          <div className="mb-4 flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-600" />
            <span>
              {parsed.length} transactions found in{" "}
              <strong>{fileName}</strong>
              {dupeCount > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  &middot; {dupeCount} already imported
                </span>
              )}
              {suggestedCount > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  &middot; {suggestedCount} with suggestions
                </span>
              )}
              <span className="text-muted-foreground">
                {" "}
                &middot; <strong>{newRows.length} new</strong>
              </span>
            </span>
          </div>

          {suggestedCount > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Lightning className="h-3 w-3" />
                {suggestedCount} suggestion
                {suggestedCount !== 1 ? "s" : ""} available
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={acceptAllSuggestions}
              >
                Accept All Suggestions
              </Button>
            </div>
          )}

          <div className="rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Client</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.map((row, i) => {
                  const key = makeKey(row);
                  const isDupe = duplicateKeys.has(key);
                  const rowSuggs = suggestions[key] ?? [];
                  const selected = selectedClients[key] ?? null;
                  const isDeposit = row.amount > 0;
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
                        {!isDupe && isDeposit && (
                          <ClientPicker
                            suggestions={rowSuggs}
                            allClients={allClients}
                            selected={selected}
                            onSelect={(c) => selectClient(key, c)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/statement">Cancel</Link>
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
  );
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/statement/import/page.tsx
git commit -m "feat: add full-page import statement flow with client picker"
```

---

### Task 4: Update statement page to link to import page

**Files:**
- Modify: `src/app/(dashboard)/statement/page.tsx`
- Delete: `src/components/transactions/import-statement-dialog.tsx` (keep file but gut it or delete)

**Step 1: Replace dialog with link**

In `src/app/(dashboard)/statement/page.tsx`:

1. Remove the `ImportStatementDialog` import
2. Add `Link` import from `next/link` and `UploadSimple` icon
3. Replace `<ImportStatementDialog />` with:

```tsx
<Button variant="outline" size="sm" asChild>
  <Link href="/statement/import">
    <UploadSimple className="mr-2 h-4 w-4" />
    Import Statement
  </Link>
</Button>
```

**Step 2: Delete the old dialog file**

Delete `src/components/transactions/import-statement-dialog.tsx` since it's fully replaced.

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/statement/page.tsx
git rm src/components/transactions/import-statement-dialog.tsx
git commit -m "feat: replace import dialog with full-page import flow"
```

---

### Task 5: Visual test and polish

**Step 1: Start dev server and test**

Navigate to `/statement` and click "Import Statement" — should go to `/statement/import`.

**Step 2: Upload a test file**

Upload a bank statement. Verify:
- Transactions table renders with full viewport
- Deposit rows show suggestion pills with ✓/✕ inside them
- Clicking ✓ on a suggestion selects that client (pill turns green with only ✕)
- Clicking ✕ deselects (goes back to suggestion pills)
- Clicking "Search" opens a popover with client search
- Selecting from search sets the client
- "Accept All Suggestions" works
- Withdrawal rows (negative amounts) don't show client picker
- Duplicate rows are grayed out
- Import button works and redirects to `/statement`

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish import statement page after visual testing"
```
