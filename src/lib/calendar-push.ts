import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "./google-calendar";

export async function pushSessionToCalendar(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionId: number,
  accessToken: string,
): Promise<{ success: boolean; eventId?: string }> {
  // Check if outbound sync is enabled
  const { data: settings } = await supabase
    .from("therapist_settings")
    .select("google_calendar_id, outbound_sync_enabled")
    .eq("user_id", userId)
    .single();

  if (!settings?.outbound_sync_enabled || !settings.google_calendar_id) {
    return { success: false };
  }

  // Load session with client
  const { data: session } = await supabase
    .from("sessions")
    .select("*, clients(name, email, phone)")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (!session) return { success: false };

  const client = (session as any).clients as {
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  const summary = client?.name ?? "Therapy Session";
  const description = session.notes ?? undefined;

  // Build start/end datetimes
  const startTime = session.start_time ?? "09:00:00";
  const endTime = session.end_time ?? "10:00:00";
  const start = `${session.date}T${startTime}`;
  const end = `${session.date}T${endTime}`;

  try {
    if (session.status === "cancelled") {
      // Delete the GCal event if it exists
      if (session.google_event_id) {
        await deleteCalendarEvent(
          accessToken,
          settings.google_calendar_id,
          session.google_event_id,
        );
        await supabase
          .from("sessions")
          .update({ google_event_id: null })
          .eq("id", sessionId);
      }
      return { success: true };
    }

    if (session.google_event_id) {
      // Update existing event
      await updateCalendarEvent(
        accessToken,
        settings.google_calendar_id,
        session.google_event_id,
        {
          summary,
          description,
          start,
          end,
        },
      );
      return { success: true, eventId: session.google_event_id };
    } else {
      // Create new event
      const eventId = await createCalendarEvent(
        accessToken,
        settings.google_calendar_id,
        {
          summary,
          description,
          start,
          end,
        },
      );
      if (eventId) {
        await supabase
          .from("sessions")
          .update({ google_event_id: eventId })
          .eq("id", sessionId);
      }
      return { success: true, eventId: eventId ?? undefined };
    }
  } catch (error) {
    console.error("Failed to push session to calendar:", error);
    return { success: false };
  }
}
