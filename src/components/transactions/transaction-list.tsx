"use client";

import { useState } from "react";
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
import { CaretLeft, CaretRight, User } from "@/components/ui/icons";
import { formatINR, formatDate } from "@/lib/format";

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
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
  const paged = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Summary stats
  const deposits = transactions.filter((t) => t.amount > 0);
  const withdrawals = transactions.filter((t) => t.amount < 0);
  const totalDeposits = deposits.reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = withdrawals.reduce((s, t) => s + t.amount, 0);
  const linkedCount = transactions.filter(
    (t) => t.client_payments.length > 0
  ).length;

  return (
    <div className="mt-6 space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          {transactions.length} transaction
          {transactions.length !== 1 ? "s" : ""}
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell className="whitespace-nowrap text-xs tabular-nums">
                  {formatDate(txn.date)}
                </TableCell>
                <TableCell className="max-w-[400px] text-xs">
                  <span className="line-clamp-1" title={txn.narration ?? ""}>
                    {txn.narration}
                  </span>
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
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                    >
                      {txn.category}
                    </Badge>
                  ) : null}
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
