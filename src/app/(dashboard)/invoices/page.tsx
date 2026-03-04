import { Button } from "@/components/ui/button";
import { Plus } from "@/components/ui/icons";

export default function InvoicesPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate invoices for corporate and insurance clients
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      <div className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">
          No invoices created yet.
        </p>
      </div>
    </div>
  );
}
