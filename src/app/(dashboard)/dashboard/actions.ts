"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function tagUnmatchedEvent(params: {
  eventId: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  clientId: number;
  attendeeEmail: string | null;
  updateClientEmail: boolean;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get client rate and default rate
  const [clientResult, settingsResult] = await Promise.all([
    supabase
      .from("clients")
      .select("current_rate")
      .eq("id", params.clientId)
      .single(),
    supabase
      .from("therapist_settings")
      .select("default_session_rate")
      .eq("user_id", user.id)
      .single(),
  ]);

  const rate =
    clientResult.data?.current_rate ??
    settingsResult.data?.default_session_rate ??
    null;

  // Calculate duration
  let durationMinutes: number | null = null;
  if (params.startTime && params.endTime) {
    const [sh, sm] = params.startTime.split(":").map(Number);
    const [eh, em] = params.endTime.split(":").map(Number);
    durationMinutes = eh * 60 + em - (sh * 60 + sm);
    if (durationMinutes < 0) durationMinutes = null;
  }

  // Insert session
  const { error } = await supabase.from("sessions").insert({
    user_id: user.id,
    client_id: params.clientId,
    date: params.date,
    start_time: params.startTime,
    end_time: params.endTime,
    duration_minutes: durationMinutes,
    rate,
    status: "scheduled",
    source: "calendar_import",
    google_event_id: params.eventId,
  });

  if (error) return { error: error.message };

  // Optionally update client email for future auto-matching
  if (params.updateClientEmail && params.attendeeEmail) {
    await supabase
      .from("clients")
      .update({ email: params.attendeeEmail })
      .eq("id", params.clientId)
      .eq("user_id", user.id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/sessions");
  return {};
}

export async function dismissChangelog(latestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("therapist_settings")
    .update({ last_seen_changelog: latestId })
    .eq("user_id", user.id);
}
