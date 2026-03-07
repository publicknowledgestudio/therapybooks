import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "@/components/ui/icons";
import { EmptyState } from "@/components/empty-state";

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let onboardingCompleted = false;
  let items: { id: number }[] = [];

  if (user) {
    const { data: settings } = await supabase
      .from("therapist_settings")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();
    onboardingCompleted = settings?.onboarding_completed ?? false;

    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    items = data ?? [];
  }

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

      {items.length === 0 ? (
        !onboardingCompleted ? (
          <EmptyState
            icon={Users}
            title="Import your clients"
            description="Connect Google to import your client list from contacts, or add clients manually."
            action={{ label: "Connect Google", href: "/onboarding" }}
            secondaryAction={{ label: "Add Client", href: "/clients/new" }}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Import from Google Contacts or add clients manually."
            action={{ label: "Import from Contacts", href: "/onboarding" }}
            secondaryAction={{ label: "Add Client", href: "/clients/new" }}
          />
        )
      ) : (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            {items.length} client{items.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
