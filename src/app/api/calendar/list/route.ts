import { createClient } from "@/lib/supabase/server";
import { listCalendars } from "@/lib/google-calendar";
import { NextResponse } from "next/server";

export async function GET() {
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
    const calendars = await listCalendars(session.provider_token);
    return NextResponse.json({ calendars });
  } catch (error) {
    console.error("Failed to list calendars:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendars" },
      { status: 500 },
    );
  }
}
