import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const userEmail = user.email;

  // Fetch bookings with joined session data
  const { data: bookings, error } = await admin
    .from("bookings")
    .select(
      "id, client_name, client_email, booked_at, cancelled_at, therapist_user_id, session_id, sessions(id, date, start_time, end_time, status, duration_minutes, rate)"
    )
    .eq("client_email", userEmail)
    .order("booked_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }

  // Collect unique therapist_user_ids to look up therapist names and settings
  const therapistUserIds = [
    ...new Set((bookings ?? []).map((b) => b.therapist_user_id)),
  ];

  // Fetch therapist info
  const { data: therapists } = await admin
    .from("therapists")
    .select("user_id, name")
    .in("user_id", therapistUserIds);

  // Fetch therapist settings (cancellation window)
  const { data: settings } = await admin
    .from("therapist_settings")
    .select("user_id, cancellation_window_hours, practice_name")
    .in("user_id", therapistUserIds);

  const therapistMap = new Map(
    (therapists ?? []).map((t) => [t.user_id, t])
  );
  const settingsMap = new Map(
    (settings ?? []).map((s) => [s.user_id, s])
  );

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const upcoming: typeof enriched = [];
  const past: typeof enriched = [];

  const enriched = (bookings ?? []).map((booking) => {
    const session = booking.sessions as {
      id: number;
      date: string;
      start_time: string | null;
      end_time: string | null;
      status: string;
      duration_minutes: number | null;
      rate: number | null;
    } | null;

    const therapist = therapistMap.get(booking.therapist_user_id);
    const therapistSettings = settingsMap.get(booking.therapist_user_id);

    // Determine if cancellation is still allowed
    let canCancel = false;
    if (session && !booking.cancelled_at && session.status !== "cancelled") {
      const cancellationWindowHours =
        therapistSettings?.cancellation_window_hours ?? 24;
      const sessionDateTime = new Date(
        `${session.date}T${session.start_time || "00:00:00"}`
      );
      const deadline = new Date(
        sessionDateTime.getTime() - cancellationWindowHours * 60 * 60 * 1000
      );
      canCancel = now < deadline;
    }

    return {
      id: booking.id,
      clientName: booking.client_name,
      bookedAt: booking.booked_at,
      cancelledAt: booking.cancelled_at,
      therapistName: therapist?.name ?? "Unknown",
      practiceName: therapistSettings?.practice_name ?? null,
      sessionDate: session?.date ?? null,
      startTime: session?.start_time ?? null,
      endTime: session?.end_time ?? null,
      sessionStatus: session?.status ?? null,
      durationMinutes: session?.duration_minutes ?? null,
      canCancel,
    };
  });

  for (const appointment of enriched) {
    if (!appointment.sessionDate) {
      past.push(appointment);
      continue;
    }
    if (
      appointment.cancelledAt ||
      appointment.sessionDate < today ||
      (appointment.sessionDate === today &&
        appointment.startTime &&
        appointment.startTime <= now.toTimeString().slice(0, 8))
    ) {
      past.push(appointment);
    } else {
      upcoming.push(appointment);
    }
  }

  // Sort upcoming by session date ascending (soonest first)
  upcoming.sort((a, b) => {
    const dateA = `${a.sessionDate}T${a.startTime || "00:00"}`;
    const dateB = `${b.sessionDate}T${b.startTime || "00:00"}`;
    return dateA.localeCompare(dateB);
  });

  // Sort past by session date descending (most recent first)
  past.sort((a, b) => {
    const dateA = `${a.sessionDate}T${a.startTime || "00:00"}`;
    const dateB = `${b.sessionDate}T${b.startTime || "00:00"}`;
    return dateB.localeCompare(dateA);
  });

  return NextResponse.json({ upcoming, past });
}
