import { createClient } from "@/lib/supabase/server";
import { Users } from "@/components/ui/icons";
import { EmptyState } from "@/components/empty-state";
import { ClientList, type ClientRow } from "@/components/clients/client-list";
import { AddClientDialog } from "@/components/clients/add-client-dialog";

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let onboardingCompleted = false;
  let clients: ClientRow[] = [];

  if (user) {
    const { data: settings } = await supabase
      .from("therapist_settings")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();
    onboardingCompleted = settings?.onboarding_completed ?? false;

    // Fetch clients with their sessions and payments
    const { data: clientRows } = await supabase
      .from("clients")
      .select(
        "id, name, email, phone, opening_balance, sessions(date, status, rate), client_payments(amount)"
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("name");

    const today = new Date().toISOString().split("T")[0];

    clients = (clientRows ?? []).map((c) => {
      // Next session: earliest future session that isn't cancelled
      const futureSessions = (c.sessions ?? [])
        .filter(
          (s: { date: string; status: string }) =>
            s.date >= today && s.status !== "cancelled"
        )
        .sort((a: { date: string }, b: { date: string }) =>
          a.date.localeCompare(b.date)
        );
      const nextSessionDate =
        futureSessions.length > 0 ? futureSessions[0].date : null;

      // Balance: opening balance + total charged (sum of session rates) minus total paid
      const openingBalance = (c as { opening_balance?: number }).opening_balance ?? 0;
      const totalCharged = (c.sessions ?? [])
        .filter((s: { status: string }) => s.status !== "cancelled")
        .reduce(
          (sum: number, s: { rate: number | null }) => sum + (s.rate ?? 0),
          0
        );
      const totalPaid = (c.client_payments ?? []).reduce(
        (sum: number, p: { amount: number }) => sum + p.amount,
        0
      );
      const balance = openingBalance + totalCharged - totalPaid;

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        nextSessionDate,
        balance,
      };
    });
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
        <AddClientDialog />
      </div>

      {clients.length === 0 ? (
        !onboardingCompleted ? (
          <EmptyState
            icon={Users}
            title="Add your active clients"
            description="Start by adding clients you currently see. Import from Google Contacts or add them manually. If they owe you money from before, you can set an opening balance."
            action={{ label: "Connect Google", href: "/onboarding" }}
            secondaryAction={{ label: "Add Client", href: "/clients/new" }}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Add clients you currently see. If they owe you money from before, set an opening balance when adding them."
            action={{ label: "Import from Contacts", href: "/onboarding" }}
            secondaryAction={{ label: "Add Client", href: "/clients/new" }}
          />
        )
      ) : (
        <ClientList clients={clients} />
      )}
    </div>
  );
}
