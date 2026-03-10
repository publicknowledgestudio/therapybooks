import { createAdminClient } from "@/lib/supabase/admin";
import { pushSessionToCalendar } from "@/lib/calendar-push";
import { getAccessTokenFromRefresh } from "@/lib/google-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: {
    slug?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slug, date, startTime, endTime, clientName, clientEmail, clientPhone } =
    body;

  if (!slug || !date || !startTime || !clientName || !clientEmail) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Look up therapist settings
  const { data: settings } = await supabase
    .from("therapist_settings")
    .select("user_id, session_duration_minutes, practice_name")
    .eq("booking_slug", slug)
    .single();

  if (!settings) {
    return NextResponse.json(
      { error: "Therapist not found" },
      { status: 404 },
    );
  }

  // Look up therapist name
  const { data: therapist } = await supabase
    .from("therapists")
    .select("name")
    .eq("user_id", settings.user_id)
    .single();

  // Find or create client
  let clientId: number | null = null;
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", settings.user_id)
    .eq("email", clientEmail)
    .single();

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: newClient } = await supabase
      .from("clients")
      .insert({
        user_id: settings.user_id,
        name: clientName,
        email: clientEmail,
        phone: clientPhone || null,
      })
      .select("id")
      .single();
    clientId = newClient?.id ?? null;
  }

  if (!clientId) {
    return NextResponse.json(
      { error: "Failed to create client record" },
      { status: 500 },
    );
  }

  // Create session
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: settings.user_id,
      client_id: clientId,
      date,
      start_time: startTime,
      end_time: endTime || null,
      duration_minutes: settings.session_duration_minutes,
      status: "scheduled",
      source: "booking_page",
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }

  // Create booking
  const { error: bookingError } = await supabase.from("bookings").insert({
    therapist_user_id: settings.user_id,
    session_id: session.id,
    client_name: clientName,
    client_email: clientEmail,
    client_phone: clientPhone || null,
  });

  if (bookingError) {
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 },
    );
  }

  // Push to Google Calendar (fire-and-forget — don't block the response)
  pushToCalendar(supabase, settings.user_id, session.id).catch((err) =>
    console.error("Calendar push failed for booking:", err),
  );

  return NextResponse.json({
    success: true,
    booking: {
      date,
      startTime,
      endTime: endTime || null,
      duration: settings.session_duration_minutes,
      therapistName: therapist?.name || settings.practice_name || "",
      practiceName: settings.practice_name || "",
    },
  });
}

/**
 * Fetch the therapist's Google refresh token, exchange it for an access token,
 * and push the session to their Google Calendar.
 */
async function pushToCalendar(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  sessionId: number,
) {
  const { data: calSettings } = await supabase
    .from("therapist_settings")
    .select("google_refresh_token, outbound_sync_enabled")
    .eq("user_id", userId)
    .single();

  if (!calSettings?.outbound_sync_enabled || !calSettings.google_refresh_token) {
    return; // Calendar sync not configured — nothing to do
  }

  const accessToken = await getAccessTokenFromRefresh(
    calSettings.google_refresh_token,
  );
  if (!accessToken) {
    console.error("Could not refresh Google access token for user", userId);
    return;
  }

  await pushSessionToCalendar(supabase, userId, sessionId, accessToken);
}
