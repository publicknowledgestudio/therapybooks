import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { UploadSimple, ArrowsLeftRight } from "@/components/ui/icons";
import { EmptyState } from "@/components/empty-state";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let items: { id: number }[] = [];

  if (user) {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    items = data ?? [];
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bank transactions and payment allocations
          </p>
        </div>
        <Button variant="outline" size="sm">
          <UploadSimple className="mr-1.5 h-4 w-4" />
          Import Statement
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ArrowsLeftRight}
          title="No transactions yet"
          description="Import a bank statement to see your transactions and allocate payments."
          action={{ label: "Import Statement", variant: "outline" }}
        />
      ) : (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            {items.length} transaction{items.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
