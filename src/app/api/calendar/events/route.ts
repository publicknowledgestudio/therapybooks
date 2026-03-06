import { createClient } from "@/lib/supabase/server";
import { getRecentEvents } from "@/lib/google-calendar";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const calendarId = searchParams.get("calendarId");

  if (!calendarId) {
    return NextResponse.json(
      { error: "calendarId is required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.provider_token) {
    return NextResponse.json(
      { error: "Not authenticated with Google" },
      { status: 401 },
    );
  }

  try {
    const events = await getRecentEvents(session.provider_token, calendarId);
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
