import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const monthStart = `${today.slice(0, 7)}-01`;

  // Run all queries in parallel
  const [settingsResult, todaySessionsResult, activeClientsResult, monthSessionsResult] =
    await Promise.all([
      // Therapist settings
      supabase
        .from("therapist_settings")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single(),

      // Today's sessions with client info
      supabase
        .from("sessions")
        .select("id, date, start_time, end_time, status, rate, is_chargeable, clients(name, phone)")
        .eq("user_id", user.id)
        .eq("date", today)
        .neq("status", "cancelled")
        .order("start_time", { ascending: true }),

      // Active clients count
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true),

      // Sessions this month (for count and revenue)
      supabase
        .from("sessions")
        .select("id, rate, status, is_chargeable")
        .eq("user_id", user.id)
        .gte("date", monthStart)
        .lte("date", today)
        .in("status", ["scheduled", "confirmed"]),
    ]);

  const onboardingCompleted = settingsResult.data?.onboarding_completed ?? false;

  // Map today's sessions
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

  // Stats
  const activeClients = activeClientsResult.count ?? 0;
  const monthSessions = monthSessionsResult.data ?? [];
  const sessionsThisMonth = monthSessions.length;
  const revenueThisMonth = monthSessions
    .filter((s) => s.is_chargeable && s.rate)
    .reduce((sum, s) => sum + (s.rate ?? 0), 0);

  return NextResponse.json({
    onboardingCompleted,
    todaySessions,
    stats: {
      activeClients,
      sessionsThisMonth,
      revenueThisMonth,
      outstandingBalances: 0,
    },
  });
}
