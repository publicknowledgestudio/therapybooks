import { SupabaseClient } from "@supabase/supabase-js";
import { getRecentEvents } from "./google-calendar";
import { createGoogleClient } from "./google";
import type { Database } from "./database.types";

export interface SyncResult {
  created: number;
  skipped: number;
  unmatched: number;
}

export async function syncCalendarEvents(
  supabase: SupabaseClient<Database>,
  userId: string,
  accessToken: string,
  calendarId: string,
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, skipped: 0, unmatched: 0 };

  // Fetch past events from Google Calendar (last 30 days)
  const pastEvents = await getRecentEvents(accessToken, calendarId, 30);

  // Fetch upcoming events (next 30 days)
  const { calendar } = createGoogleClient(accessToken);
  const futureRes = await calendar.events.list({
    calendarId,
    timeMin: new Date().toISOString(),
    timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 500,
  });

  const allEvents = [...pastEvents, ...(futureRes.data.items ?? [])];

  // Deduplicate by event ID
  const uniqueEvents = new Map<string, (typeof allEvents)[0]>();
  for (const event of allEvents) {
    if (event.id) uniqueEvents.set(event.id, event);
  }

  // Get existing google_event_ids to skip already-imported events
  const { data: existingSessions } = await supabase
    .from("sessions")
    .select("google_event_id")
    .eq("user_id", userId)
    .not("google_event_id", "is", null);

  const importedEventIds = new Set(
    existingSessions?.map((s) => s.google_event_id) ?? [],
  );

  // Get all clients for email / name matching
  const { data: clients } = await supabase
    .from("clients")
    .select("id, email, name")
    .eq("user_id", userId);

  const clientsByEmail = new Map<string, number>();
  const clientsByName = new Map<string, number>();
  for (const client of clients ?? []) {
    if (client.email) clientsByEmail.set(client.email.toLowerCase(), client.id);
    if (client.name) clientsByName.set(client.name.toLowerCase(), client.id);
  }

  for (const [eventId, event] of uniqueEvents) {
    // Skip already imported
    if (importedEventIds.has(eventId)) {
      result.skipped++;
      continue;
    }

    // Skip all-day events (not therapy sessions)
    if (event.start?.date && !event.start?.dateTime) {
      result.skipped++;
      continue;
    }

    // Skip cancelled events
    if (event.status === "cancelled") {
      result.skipped++;
      continue;
    }

    // Parse start/end times
    const startDt = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : null;
    const endDt = event.end?.dateTime ? new Date(event.end.dateTime) : null;

    if (!startDt) {
      result.skipped++;
      continue;
    }

    // Match client by attendee email or event title
    let clientId: number | null = null;

    // Try matching by attendee email
    for (const attendee of event.attendees ?? []) {
      if (attendee.email && !attendee.self) {
        const matched = clientsByEmail.get(attendee.email.toLowerCase());
        if (matched) {
          clientId = matched;
          break;
        }
      }
    }

    // Try matching by event title containing client name
    if (!clientId && event.summary) {
      const title = event.summary.toLowerCase();
      for (const [name, id] of clientsByName) {
        if (title.includes(name)) {
          clientId = id;
          break;
        }
      }
    }

    if (!clientId) {
      result.unmatched++;
      continue; // Skip events we can't match to a client
    }

    // Calculate duration
    const durationMinutes =
      endDt && startDt
        ? Math.round((endDt.getTime() - startDt.getTime()) / 60000)
        : null;

    // Format date and times
    const date = startDt.toISOString().split("T")[0];
    const startTime = startDt.toTimeString().slice(0, 8); // HH:MM:SS
    const endTime = endDt ? endDt.toTimeString().slice(0, 8) : null;

    // Insert session
    const { error } = await supabase.from("sessions").insert({
      user_id: userId,
      client_id: clientId,
      date,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      status: "scheduled",
      source: "calendar_import",
      google_event_id: eventId,
      notes: event.description ?? null,
    });

    if (!error) {
      result.created++;
    } else {
      console.error("Failed to insert session:", error);
      result.skipped++;
    }
  }

  return result;
}
