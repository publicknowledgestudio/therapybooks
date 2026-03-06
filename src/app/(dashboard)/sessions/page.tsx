import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, CalendarBlank } from "@/components/ui/icons";
import { EmptyState } from "@/components/empty-state";

export default async function SessionsPage() {
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
      .from("sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    items = data ?? [];
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and manage therapy sessions
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Session
        </Button>
      </div>

      {items.length === 0 ? (
        !onboardingCompleted ? (
          <EmptyState
            icon={CalendarBlank}
            title="Sync your calendar"
            description="Connect Google Calendar to automatically import and track your sessions."
            action={{ label: "Connect Google Calendar", href: "/onboarding" }}
          />
        ) : (
          <EmptyState
            icon={CalendarBlank}
            title="No sessions yet"
            description="Sessions will appear as you sync your calendar or clients book appointments."
          />
        )
      ) : (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            {items.length} session{items.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
