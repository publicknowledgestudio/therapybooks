import { Button } from "@/components/ui/button";
import { Plus } from "@/components/ui/icons";

export default function ClientsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your client list and balances
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Client
        </Button>
      </div>

      <div className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">
          No clients yet. Add your first client to start tracking sessions and balances.
        </p>
      </div>
    </div>
  );
}
