import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "@/components/ui/icons";
import { EmptyState } from "@/components/empty-state";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let items: { id: number }[] = [];

  if (user) {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    items = data ?? [];
  }

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

      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Create your first invoice after recording some sessions."
          action={{
            label: "New Invoice",
            href: "/invoices/new",
            variant: "outline",
          }}
        />
      ) : (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            {items.length} invoice{items.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
