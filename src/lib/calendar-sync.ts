import { SupabaseClient } from "@supabase/supabase-js";
import { getRecentEvents } from "./google-calendar";
import { createGoogleClient } from "./google";
import type { Database } from "./database.types";

export interface SyncEventDetail {
  eventId: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  attendeeEmail: string | null;
  clientName: string | null;
}

export interface SyncResult {
  created: SyncEventDetail[];
  skipped: SyncEventDetail[];
  unmatched: SyncEventDetail[];
}

export async function syncCalendarEvents(
  supabase: SupabaseClient<Database>,
  userId: string,
  accessToken: string,
  calendarId: string,
): Promise<SyncResult> {
  const result: SyncResult = { created: [], skipped: [], unmatched: [] };

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

  // Get default session rate from settings
  const { data: settings } = await supabase
    .from("therapist_settings")
    .select("default_session_rate")
    .eq("user_id", userId)
    .single();
  const defaultRate = settings?.default_session_rate ?? null;

  // Get all clients for email / name matching
  const { data: clients } = await supabase
    .from("clients")
    .select("id, email, name, current_rate")
    .eq("user_id", userId);

  const clientsByEmail = new Map<string, number>();
  const clientsByName = new Map<string, number>();
  const clientRates = new Map<number, number | null>();
  for (const client of clients ?? []) {
    if (client.email) clientsByEmail.set(client.email.toLowerCase(), client.id);
    if (client.name) clientsByName.set(client.name.toLowerCase(), client.id);
    clientRates.set(client.id, client.current_rate);
  }

  function eventDetail(
    evtId: string,
    evt: (typeof allEvents)[0],
    clientName?: string | null,
  ): SyncEventDetail {
    const sDt = evt.start?.dateTime ? new Date(evt.start.dateTime) : null;
    const eDt = evt.end?.dateTime ? new Date(evt.end.dateTime) : null;
    const istTime: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
    const istDate: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
    return {
      eventId: evtId,
      title: evt.summary ?? "Untitled",
      date: sDt ? sDt.toLocaleDateString("en-CA", istDate) : "",
      startTime: sDt ? sDt.toLocaleTimeString("en-GB", istTime) : null,
      endTime: eDt ? eDt.toLocaleTimeString("en-GB", istTime) : null,
      attendeeEmail: (evt.attendees ?? []).find(a => a.email && !a.self)?.email ?? null,
      clientName: clientName ?? null,
    };
  }

  for (const [eventId, event] of uniqueEvents) {
    // Skip already imported
    if (importedEventIds.has(eventId)) {
      result.skipped.push(eventDetail(eventId, event));
      continue;
    }

    // Skip all-day events (not therapy sessions)
    if (event.start?.date && !event.start?.dateTime) {
      result.skipped.push(eventDetail(eventId, event));
      continue;
    }

    // Skip cancelled events
    if (event.status === "cancelled") {
      result.skipped.push(eventDetail(eventId, event));
      continue;
    }

    // Parse start/end times
    const startDt = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : null;
    const endDt = event.end?.dateTime ? new Date(event.end.dateTime) : null;

    if (!startDt) {
      result.skipped.push(eventDetail(eventId, event));
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
      result.unmatched.push(eventDetail(eventId, event));
      continue; // Skip events we can't match to a client
    }

    // Calculate duration
    const durationMinutes =
      endDt && startDt
        ? Math.round((endDt.getTime() - startDt.getTime()) / 60000)
        : null;

    // Format date and times in IST (Asia/Kolkata)
    const istOptions: Intl.DateTimeFormatOptions = {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    const dateOptions: Intl.DateTimeFormatOptions = {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    // Format date as YYYY-MM-DD
    const dateParts = startDt.toLocaleDateString("en-CA", dateOptions); // en-CA gives YYYY-MM-DD
    const date = dateParts;
    const startTime = startDt.toLocaleTimeString("en-GB", istOptions); // HH:MM:SS
    const endTime = endDt
      ? endDt.toLocaleTimeString("en-GB", istOptions)
      : null;

    // Detect session type from conference data
    const hasVideo = !!(event.conferenceData || event.hangoutLink);

    // Use client's rate, falling back to default session rate
    const rate = clientRates.get(clientId) ?? defaultRate;

    // Insert session
    const { error } = await supabase.from("sessions").insert({
      user_id: userId,
      client_id: clientId,
      date,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      rate,
      status: "scheduled",
      session_type: hasVideo ? "video" : "in_person",
      source: "calendar_import",
      google_event_id: eventId,
      notes: event.description ?? null,
    });

    const matchedClientName = (clients ?? []).find(c => c.id === clientId)?.name ?? null;
    if (!error) {
      result.created.push(eventDetail(eventId, event, matchedClientName));
    } else {
      console.error("Failed to insert session:", error);
      result.skipped.push(eventDetail(eventId, event, matchedClientName));
    }
  }

  return result;
}
