import { createClient } from "@/lib/supabase/server";
import { CalendarBlank, Plus } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { SessionStatCards } from "@/components/sessions/session-stat-cards";
import { SessionList, type SessionRow } from "@/components/sessions/session-list";

function getWeekRange(weeksAgo: number): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

function getMonthRange(monthsAgo: number): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() - monthsAgo;

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  return {
    start: first.toISOString().split("T")[0],
    end: last.toISOString().split("T")[0],
  };
}

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let onboardingCompleted = false;
  let sessions: SessionRow[] = [];
  let thisWeek = 0;
  let lastWeek = 0;
  let thisMonth = 0;
  let lastMonth = 0;

  if (user) {
    const { data: settings } = await supabase
      .from("therapist_settings")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();
    onboardingCompleted = settings?.onboarding_completed ?? false;

    // Compute date ranges
    const thisWeekRange = getWeekRange(0);
    const lastWeekRange = getWeekRange(1);
    const thisMonthRange = getMonthRange(0);
    const lastMonthRange = getMonthRange(1);

    // Fetch all sessions + stat counts in parallel
    const [sessionsResult, twResult, lwResult, tmResult, lmResult] =
      await Promise.all([
        supabase
          .from("sessions")
          .select(
            "id, date, start_time, session_type, status, clients(name, phone)",
          )
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .order("start_time", { ascending: false }),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .gte("date", thisWeekRange.start)
          .lte("date", thisWeekRange.end),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .gte("date", lastWeekRange.start)
          .lte("date", lastWeekRange.end),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .gte("date", thisMonthRange.start)
          .lte("date", thisMonthRange.end),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .gte("date", lastMonthRange.start)
          .lte("date", lastMonthRange.end),
      ]);

    thisWeek = twResult.count ?? 0;
    lastWeek = lwResult.count ?? 0;
    thisMonth = tmResult.count ?? 0;
    lastMonth = lmResult.count ?? 0;

    sessions = (sessionsResult.data ?? []).map((s) => {
      const client = s.clients as unknown as {
        name: string;
        phone: string | null;
      } | null;
      return {
        id: s.id,
        date: s.date,
        startTime: s.start_time,
        clientName: client?.name ?? "Unknown",
        clientPhone: client?.phone ?? null,
        sessionType: s.session_type,
        status: s.status,
      };
    });
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

      {sessions.length === 0 ? (
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
        <>
          <div className="mt-6">
            <SessionStatCards
              thisWeek={thisWeek}
              lastWeek={lastWeek}
              thisMonth={thisMonth}
              lastMonth={lastMonth}
            />
          </div>
          <SessionList sessions={sessions} />
        </>
      )}
    </div>
  );
}
