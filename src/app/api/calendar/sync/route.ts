import { createClient } from "@/lib/supabase/server";
import { syncCalendarEvents } from "@/lib/calendar-sync";
import { getAccessTokenFromRefresh } from "@/lib/google-auth";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get therapist settings for calendar ID and refresh token
  const { data: settings } = await supabase
    .from("therapist_settings")
    .select("google_calendar_id, google_refresh_token")
    .eq("user_id", user.id)
    .single();

  if (!settings?.google_calendar_id) {
    return NextResponse.json(
      { error: "No calendar configured. Complete onboarding first." },
      { status: 400 },
    );
  }

  // Try provider_token from session first, fall back to refresh token
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let accessToken = session?.provider_token ?? null;

  if (!accessToken && settings.google_refresh_token) {
    accessToken = await getAccessTokenFromRefresh(
      settings.google_refresh_token,
    );
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: "Google token expired. Please sign out and sign in again with Google." },
      { status: 401 },
    );
  }

  try {
    const result = await syncCalendarEvents(
      supabase,
      user.id,
      accessToken,
      settings.google_calendar_id,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Calendar sync failed:", error);
    return NextResponse.json(
      { error: "Calendar sync failed" },
      { status: 500 },
    );
  }
}
