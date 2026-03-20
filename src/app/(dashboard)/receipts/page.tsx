import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Receipt } from "@/components/ui/icons";
import { EmptyState } from "@/components/empty-state";
import { formatINR } from "@/lib/format";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ReceiptActions } from "./receipt-actions";
import { BackfillButton } from "./backfill-button";

interface ReceiptRow {
  id: number;
  receipt_number: number;
  date: string;
  amount: number;
  status: string;
  client_id: number;
  clients: { name: string; phone: string | null } | null;
}

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("receipts")
    .select("id, receipt_number, date, amount, status, client_id, clients(name, phone)")
    .eq("user_id", user.id)
    .order("receipt_number", { ascending: false });

  const receipts = (data as unknown as ReceiptRow[]) ?? [];

  // Check if there are payments without receipts
  const { count: paymentCount } = await supabase
    .from("client_payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const hasUnreceiptedPayments =
    (paymentCount ?? 0) > receipts.filter((r) => r.status !== "void").length;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Payment Receipts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-generated receipts for client payments
        </p>
      </div>

      {hasUnreceiptedPayments && (
        <div className="mt-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Some past payments don&apos;t have receipts yet.
          </p>
          <BackfillButton />
        </div>
      )}

      {receipts.length === 0 && !hasUnreceiptedPayments ? (
        <EmptyState
          icon={Receipt}
          title="No receipts yet"
          description="Receipts are auto-generated when you record client payments."
        />
      ) : receipts.length === 0 ? null : (
        <div className="mt-6 rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => {
                const isVoid = receipt.status === "void";
                return (
                  <TableRow
                    key={receipt.id}
                    className={isVoid ? "opacity-50" : ""}
                  >
                    <TableCell className="font-mono text-sm">
                      #{String(receipt.receipt_number).padStart(3, "0")}
                    </TableCell>
                    <TableCell>{receipt.clients?.name ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(receipt.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>{formatINR(receipt.amount)}</TableCell>
                    <TableCell>
                      {isVoid ? (
                        <Badge variant="destructive">VOID</Badge>
                      ) : (
                        <Badge variant="secondary">Issued</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <ReceiptActions
                        receiptId={receipt.id}
                        clientName={receipt.clients?.name ?? ""}
                        clientPhone={receipt.clients?.phone ?? null}
                        isVoid={isVoid}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
