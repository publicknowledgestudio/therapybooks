"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  X,
  Eye,
} from "@/components/ui/icons";
import { formatINR, formatDate } from "@/lib/format";
import {
  togglePersonal,
  linkClientToTransaction,
  unlinkClientFromTransaction,
} from "@/app/(dashboard)/statement/actions";
import { usePersonalFilter } from "./personal-toggle";
import { toast } from "sonner";

interface Transaction {
  id: number;
  date: string;
  narration: string | null;
  amount: number;
  balance: number | null;
  reference: string | null;
  category: string | null;
  bank_file: string | null;
  is_personal: boolean | null;
  type: string | null;
  created_at: string;
  client_payments: Array<{
    id: number;
    amount: number;
    client: { id: number; name: string } | null;
  }>;
}

interface ClientOption {
  id: number;
  name: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  allClients?: ClientOption[];
}

const PAGE_SIZE = 50;

export function TransactionList({ transactions, allClients = [] }: TransactionListProps) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const { showPersonal } = usePersonalFilter();
  // Optimistic personal state: tracks IDs being animated out
  const [animatingOut, setAnimatingOut] = useState<Set<number>>(new Set());
  const [optimisticPersonal, setOptimisticPersonal] = useState<Set<number>>(new Set());

  const markPersonalOptimistic = useCallback((txnId: number) => {
    setOptimisticPersonal((prev) => new Set(prev).add(txnId));
    setAnimatingOut((prev) => new Set(prev).add(txnId));
    // Remove animation class after it completes, row stays hidden via optimisticPersonal
    setTimeout(() => {
      setAnimatingOut((prev) => {
        const next = new Set(prev);
        next.delete(txnId);
        return next;
      });
    }, 500);
  }, []);

  // Clean up optimistic state once server data confirms the change
  useMemo(() => {
    if (optimisticPersonal.size === 0) return;
    setOptimisticPersonal((prev) => {
      const next = new Set(prev);
      for (const id of prev) {
        const txn = transactions.find((t) => t.id === id);
        if (txn?.is_personal) next.delete(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [transactions, optimisticPersonal.size]);

  // Filter transactions
  const filtered = useMemo(() => {
    let result = transactions;

    // Hide personal unless toggled on; keep animating rows visible briefly
    if (!showPersonal) {
      result = result.filter(
        (t) =>
          (!t.is_personal && !optimisticPersonal.has(t.id)) ||
          animatingOut.has(t.id)
      );
    }

    // Search by narration, date, or linked client name
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => {
        const narration = (t.narration ?? "").toLowerCase();
        const date = t.date;
        const clientNames = t.client_payments
          .map((cp) => cp.client?.name ?? "")
          .join(" ")
          .toLowerCase();
        return (
          narration.includes(q) ||
          date.includes(q) ||
          clientNames.includes(q)
        );
      });
    }

    return result;
  }, [transactions, search, showPersonal, animatingOut, optimisticPersonal]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Summary stats (from filtered view)
  const deposits = filtered.filter((t) => t.amount > 0);
  const withdrawals = filtered.filter((t) => t.amount < 0);
  const totalDeposits = deposits.reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = withdrawals.reduce((s, t) => s + t.amount, 0);
  const linkedCount = filtered.filter(
    (t) => t.client_payments.length > 0
  ).length;
  // Reset page when search changes
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(0);
  }

  async function handleTogglePersonal(txnId: number, current: boolean) {
    const txn = transactions.find((t) => t.id === txnId);
    const narration = txn?.narration ?? "Transaction";

    if (!current) {
      // Marking as personal
      if (!showPersonal) {
        markPersonalOptimistic(txnId);
      }
      await togglePersonal(txnId, true);

      toast.custom(
        (toastId) => (
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg">
            <Eye className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground line-clamp-1">
                {narration}
              </p>
              <p className="text-sm font-medium">Marked as Personal</p>
            </div>
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline shrink-0 cursor-pointer"
              onClick={async () => {
                toast.dismiss(toastId);
                // Undo: remove from optimistic sets and revert
                setOptimisticPersonal((prev) => {
                  const next = new Set(prev);
                  next.delete(txnId);
                  return next;
                });
                setAnimatingOut((prev) => {
                  const next = new Set(prev);
                  next.delete(txnId);
                  return next;
                });
                await togglePersonal(txnId, false);
              }}
            >
              Undo
            </button>
          </div>
        ),
        { duration: 5000 }
      );
    } else {
      // Unmarking as personal
      await togglePersonal(txnId, false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Search bar */}
      <div className="relative">
        <MagnifyingGlass className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-9 w-full rounded-md border bg-white pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          {filtered.length} transaction
          {filtered.length !== 1 ? "s" : ""}
        </span>
        <span className="text-green-600">
          {formatINR(totalDeposits)} in
        </span>
        <span className="text-red-600">
          {formatINR(Math.abs(totalWithdrawals))} out
        </span>
        {linkedCount > 0 && (
          <span className="text-muted-foreground">
            · {linkedCount} linked to clients
          </span>
        )}
      </div>

      {/* Transaction table */}
      <div className="overflow-hidden rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Narration</TableHead>
              <TableHead className="text-right w-[120px]">Amount</TableHead>
              <TableHead className="text-right w-[120px]">Balance</TableHead>
              <TableHead className="w-[160px]">Linked</TableHead>
              <TableHead className="w-[80px] text-center">Personal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((txn) => (
              <TableRow
                key={txn.id}
                className={
                  animatingOut.has(txn.id)
                    ? "animate-out fade-out slide-out-to-right duration-500 opacity-50"
                    : txn.is_personal
                      ? "opacity-50"
                      : undefined
                }
              >
                <TableCell className="whitespace-nowrap text-xs tabular-nums">
                  {formatDate(txn.date)}
                </TableCell>
                <TableCell className="max-w-[400px] text-xs">
                  <div className="flex items-center">
                    <span className="line-clamp-1" title={txn.narration ?? ""}>
                      {txn.narration}
                    </span>
                    {txn.type === "cash" && (
                      <Badge variant="outline" className="ml-2 text-[10px] shrink-0">
                        Cash
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell
                  className={`text-right text-xs tabular-nums font-medium ${
                    txn.amount > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {txn.amount > 0 ? "+" : ""}
                  {formatINR(txn.amount)}
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                  {txn.balance != null ? formatINR(txn.balance) : "—"}
                </TableCell>
                <TableCell className="text-xs">
                  <LinkedCell
                    txn={txn}
                    allClients={allClients}
                  />
                </TableCell>
                <TableCell
                  className="text-center cursor-pointer"
                  onClick={() => handleTogglePersonal(txn.id, !!txn.is_personal)}
                >
                  <Checkbox
                    checked={!!txn.is_personal}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() =>
                      handleTogglePersonal(txn.id, !!txn.is_personal)
                    }
                    className="cursor-pointer transition-colors hover:border-amber-400 hover:bg-amber-50 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                    aria-label={
                      txn.is_personal
                        ? "Marked as personal — click to unmark"
                        : "Mark as personal"
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <CaretLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <CaretRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkedCell({
  txn,
  allClients,
}: {
  txn: Transaction;
  allClients: ClientOption[];
}) {
  const [open, setOpen] = useState(false);
  const [linking, setLinking] = useState(false);

  async function handleLink(client: ClientOption) {
    setLinking(true);
    setOpen(false);
    await linkClientToTransaction(txn.id, client.id, txn.amount);
    setLinking(false);
  }

  async function handleUnlink(cpId: number, clientId: number) {
    setLinking(true);
    await unlinkClientFromTransaction(cpId, clientId);
    setLinking(false);
  }

  // Already linked clients
  const linkedIds = new Set(txn.client_payments.map((cp) => cp.client?.id).filter(Boolean));
  const availableClients = allClients.filter((c) => !linkedIds.has(c.id));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {txn.client_payments.map((cp) => (
        <span key={cp.id} className="inline-flex items-center gap-1 group">
          <a
            href={cp.client ? `/clients/${cp.client.id}` : undefined}
            className="text-xs text-foreground hover:underline"
          >
            {cp.client?.name ?? "Unknown"}
          </a>
          <button
            type="button"
            onClick={() => handleUnlink(cp.id, cp.client?.id ?? 0)}
            disabled={linking}
            className="hidden group-hover:inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Remove link"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}

      {txn.client_payments.length === 0 && txn.category && (
        <Badge variant="outline" className="text-[10px]">
          {txn.category}
        </Badge>
      )}

      {txn.client_payments.length === 0 && availableClients.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={linking}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground transition-colors"
              title="Link to client"
            >
              <MagnifyingGlass className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search clients..." />
              <CommandList>
                <CommandEmpty>No clients found.</CommandEmpty>
                <CommandGroup>
                  {availableClients.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.name}
                      onSelect={() => handleLink(c)}
                    >
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
