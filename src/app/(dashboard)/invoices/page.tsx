import { FileText } from "@/components/ui/icons";
import { EmptyState } from "@/components/empty-state";

export default function InvoicesPage() {
  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate invoices for corporate and insurance clients
        </p>
      </div>

      <EmptyState
        icon={FileText}
        title="Coming soon"
        description="Invoice generation is on the roadmap. You'll be able to create and send invoices to corporate and insurance clients."
      />
    </div>
  );
}
