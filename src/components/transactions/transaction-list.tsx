"use client";

import { useState, useMemo } from "react";
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
import {
  CaretLeft,
  CaretRight,
  User,
  MagnifyingGlass,
  Eye,
  EyeSlash,
} from "@/components/ui/icons";
import { formatINR, formatDate } from "@/lib/format";
import { togglePersonal } from "@/app/(dashboard)/statement/actions";

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

interface TransactionListProps {
  transactions: Transaction[];
}

const PAGE_SIZE = 50;

export function TransactionList({ transactions }: TransactionListProps) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [showPersonal, setShowPersonal] = useState(false);

  // Filter transactions
  const filtered = useMemo(() => {
    let result = transactions;

    // Hide personal unless toggled on
    if (!showPersonal) {
      result = result.filter((t) => !t.is_personal);
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
  }, [transactions, search, showPersonal]);

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
  const personalCount = transactions.filter((t) => t.is_personal).length;

  // Reset page when search changes
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(0);
  }

  async function handleTogglePersonal(txnId: number, current: boolean) {
    await togglePersonal(txnId, !current);
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Search + filters bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-9 w-full rounded-md border bg-transparent pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <Button
          variant={showPersonal ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowPersonal(!showPersonal);
            setPage(0);
          }}
          className="h-9 text-xs gap-1.5"
        >
          {showPersonal ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeSlash className="h-3.5 w-3.5" />
          )}
          Personal ({personalCount})
        </Button>
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
                className={txn.is_personal ? "opacity-50" : undefined}
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
                  {txn.client_payments.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {txn.client_payments.map((cp) => (
                        <Badge
                          key={cp.id}
                          variant="outline"
                          className="text-[10px] bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 gap-1"
                        >
                          <User className="h-2.5 w-2.5" />
                          {cp.client?.name ?? "Unknown"}
                        </Badge>
                      ))}
                    </div>
                  ) : txn.category ? (
                    <Badge variant="outline" className="text-[10px]">
                      {txn.category}
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-center">
                  <button
                    type="button"
                    onClick={() =>
                      handleTogglePersonal(txn.id, !!txn.is_personal)
                    }
                    className={`inline-flex h-5 w-5 items-center justify-center rounded text-xs transition-colors ${
                      txn.is_personal
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground"
                    }`}
                    title={
                      txn.is_personal
                        ? "Marked as personal — click to unmark"
                        : "Mark as personal"
                    }
                  >
                    P
                  </button>
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
