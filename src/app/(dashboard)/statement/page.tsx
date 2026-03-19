import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowsLeftRight, UploadSimple } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { TransactionList } from "@/components/transactions/transaction-list";
import { RecordCashPaymentDialog } from "@/components/transactions/record-cash-payment-dialog";

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
  type: string;
  created_at: string;
  client_payments: Array<{
    id: number;
    amount: number;
    client: { id: number; name: string } | null;
  }>;
}

export default async function StatementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let transactions: Transaction[] = [];

  if (user) {
    const { data } = await supabase
      .from("transactions")
      .select(
        `
        id,
        date,
        narration,
        amount,
        balance,
        reference,
        category,
        bank_file,
        is_personal,
        type,
        created_at,
        client_payments (
          id,
          amount,
          client:clients ( id, name )
        )
      `
      )
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    transactions = (data as unknown as Transaction[]) ?? [];
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Bank Statement
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Imported bank transactions and payment allocations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RecordCashPaymentDialog />
          <Button variant="outline" size="sm" asChild>
            <Link href="/statement/import">
              <UploadSimple className="mr-2 h-4 w-4" />
              Import Statement
            </Link>
          </Button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={ArrowsLeftRight}
          title="No transactions yet"
          description="Import an HDFC bank statement (.xls) to see your transactions and match payments to clients."
        />
      ) : (
        <TransactionList transactions={transactions} />
      )}
    </div>
  );
}
