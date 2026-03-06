import { createClient } from "@/lib/supabase/server";
import { listContacts } from "@/lib/google-contacts";
import { getRecentEvents } from "@/lib/google-calendar";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const calendarId = searchParams.get("calendarId");

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
    const contacts = await listContacts(session.provider_token);

    // Cross-reference with calendar attendees if calendarId provided
    const attendeeEmails = new Set<string>();
    if (calendarId) {
      try {
        const events = await getRecentEvents(
          session.provider_token,
          calendarId,
          90,
        );
        for (const event of events) {
          for (const attendee of event.attendees ?? []) {
            if (attendee.email) attendeeEmails.add(attendee.email.toLowerCase());
          }
        }
      } catch {
        // Calendar fetch failed -- proceed without cross-reference
      }
    }

    // Sort: contacts matching attendees first, then alphabetical
    const enriched = contacts.map((c) => ({
      ...c,
      inCalendar: c.email
        ? attendeeEmails.has(c.email.toLowerCase())
        : false,
    }));

    enriched.sort((a, b) => {
      if (a.inCalendar !== b.inCalendar) return a.inCalendar ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ contacts: enriched });
  } catch (error) {
    console.error("Failed to list contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 },
    );
  }
}
