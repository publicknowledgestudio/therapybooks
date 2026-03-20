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

interface ReceiptRow {
  id: number;
  receipt_number: number;
  date: string;
  total_amount: number;
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
    .select("id, receipt_number, date, total_amount, status, client_id, clients(name, phone)")
    .eq("user_id", user.id)
    .order("receipt_number", { ascending: false });

  const receipts = (data as unknown as ReceiptRow[]) ?? [];

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

      {receipts.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No receipts yet"
          description="Receipts are auto-generated when you record client payments."
        />
      ) : (
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
                    <TableCell>{formatINR(receipt.total_amount)}</TableCell>
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
