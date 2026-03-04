import { Button } from "@/components/ui/button";
import { UploadSimple } from "@/components/ui/icons";

export default function TransactionsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bank transactions and payment allocations
          </p>
        </div>
        <Button variant="outline" size="sm">
          <UploadSimple className="mr-1.5 h-4 w-4" />
          Import Statement
        </Button>
      </div>

      <div className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">
          No transactions imported yet. Import a bank statement to get started.
        </p>
      </div>
    </div>
  );
}
