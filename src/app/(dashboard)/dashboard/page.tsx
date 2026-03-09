import { createClient } from "@/lib/supabase/server";
import { StatCards } from "@/components/dashboard/stat-cards";
import { AppointmentsToday } from "@/components/dashboard/appointments-today";
import { OnboardingPrompt } from "@/components/dashboard/onboarding-prompt";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your practice</p>
        <OnboardingPrompt />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const monthStart = `${today.slice(0, 7)}-01`;

  // Run all queries in parallel
  const [settingsResult, todaySessionsResult, activeClientsResult, monthSessionsResult] =
    await Promise.all([
      supabase
        .from("therapist_settings")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single(),

      supabase
        .from("sessions")
        .select(
          "id, date, start_time, end_time, status, rate, is_chargeable, clients(name, phone)"
        )
        .eq("user_id", user.id)
        .eq("date", today)
        .neq("status", "cancelled")
        .order("start_time", { ascending: true }),

      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true),

      supabase
        .from("sessions")
        .select("id, rate, status, is_chargeable")
        .eq("user_id", user.id)
        .gte("date", monthStart)
        .lte("date", today)
        .in("status", ["scheduled", "confirmed"]),
    ]);

  const onboardingCompleted = settingsResult.data?.onboarding_completed ?? false;

  // Map today's sessions for the client component
  const todaySessions = (todaySessionsResult.data ?? []).map((s) => {
    const client = s.clients as unknown as { name: string; phone: string | null } | null;
    return {
      id: s.id,
      clientName: client?.name ?? "Unknown",
      clientPhone: client?.phone ?? null,
      startTime: s.start_time,
      endTime: s.end_time,
      status: s.status,
    };
  });

  // Compute stats
  const activeClients = activeClientsResult.count ?? 0;
  const monthSessions = monthSessionsResult.data ?? [];
  const sessionsThisMonth = monthSessions.length;
  const revenueThisMonth = monthSessions
    .filter((s) => s.is_chargeable && s.rate)
    .reduce((sum, s) => sum + (s.rate ?? 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Overview of your practice</p>

      <div className="mt-8">
        <StatCards
          activeClients={activeClients}
          sessionsThisMonth={sessionsThisMonth}
          revenueThisMonth={revenueThisMonth}
          outstandingBalances={0}
        />
      </div>

      {!onboardingCompleted && <OnboardingPrompt />}

      <AppointmentsToday sessions={todaySessions} />
    </div>
  );
}
