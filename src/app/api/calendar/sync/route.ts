import { createClient } from "@/lib/supabase/server";
import { syncCalendarEvents } from "@/lib/calendar-sync";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the user's session for provider_token
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.provider_token) {
    return NextResponse.json(
      { error: "No Google token available. Please re-authenticate." },
      { status: 401 },
    );
  }

  // Get therapist settings for calendar ID
  const { data: settings } = await supabase
    .from("therapist_settings")
    .select("google_calendar_id")
    .eq("user_id", user.id)
    .single();

  if (!settings?.google_calendar_id) {
    return NextResponse.json(
      { error: "No calendar configured. Complete onboarding first." },
      { status: 400 },
    );
  }

  try {
    const result = await syncCalendarEvents(
      supabase,
      user.id,
      session.provider_token,
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
