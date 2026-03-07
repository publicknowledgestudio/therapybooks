import { createAdminClient } from "@/lib/supabase/admin";
import { getFreeBusy } from "@/lib/google-calendar";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

interface WorkingDay {
  start: string;
  end: string;
  enabled: boolean;
}

/**
 * Exchange a Google refresh token for a fresh access token.
 */
async function getAccessTokenFromRefresh(
  refreshToken: string,
): Promise<string | null> {
  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    oauth2.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2.refreshAccessToken();
    return credentials.access_token ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const date = request.nextUrl.searchParams.get("date"); // YYYY-MM-DD

  if (!slug || !date) {
    return NextResponse.json(
      { error: "Missing slug or date" },
      { status: 400 },
    );
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Look up therapist settings by booking slug
  const { data: settings } = await supabase
    .from("therapist_settings")
    .select("*")
    .eq("booking_slug", slug)
    .single();

  if (!settings) {
    return NextResponse.json(
      { error: "Therapist not found" },
      { status: 404 },
    );
  }

  // Parse working hours for the given day
  const dayMap: Record<number, string> = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
  };
  const dateObj = new Date(date + "T12:00:00");
  const dayKey = dayMap[dateObj.getDay()];
  const workingHours = settings.working_hours as unknown as Record<string, WorkingDay>;
  const dayHours = workingHours?.[dayKey];

  if (!dayHours?.enabled) {
    return NextResponse.json({ slots: [], duration: settings.session_duration_minutes });
  }

  const duration = settings.session_duration_minutes;
  const breakTime = settings.break_between_minutes;
  const advanceNotice = settings.advance_notice_hours;

  // Try to get busy slots from Google Calendar
  let busySlots: Array<{ start: string; end: string }> = [];

  if (settings.google_calendar_id && settings.google_refresh_token) {
    const accessToken = await getAccessTokenFromRefresh(
      settings.google_refresh_token,
    );
    if (accessToken) {
      try {
        const timeMin = `${date}T${dayHours.start}:00`;
        const timeMax = `${date}T${dayHours.end}:00`;
        const busy = await getFreeBusy(
          accessToken,
          settings.google_calendar_id,
          timeMin,
          timeMax,
        );
        busySlots = busy.map((b) => ({
          start: b.start ?? "",
          end: b.end ?? "",
        }));
      } catch {
        // If Google Calendar fails, continue without busy info
      }
    }
  }

  // Also check existing sessions in the database for the same date
  const { data: existingSessions } = await supabase
    .from("sessions")
    .select("start_time, end_time, duration_minutes")
    .eq("user_id", settings.user_id)
    .eq("date", date)
    .in("status", ["scheduled", "confirmed"]);

  if (existingSessions) {
    for (const session of existingSessions) {
      if (session.start_time) {
        const endTime =
          session.end_time ||
          addMinutesToTime(session.start_time, session.duration_minutes || duration);
        busySlots.push({
          start: `${date}T${session.start_time}`,
          end: `${date}T${endTime}`,
        });
      }
    }
  }

  // Compute available slots from working hours
  const now = new Date();
  const slots: Array<{ start: string; end: string }> = [];

  const [startH, startM] = dayHours.start.split(":").map(Number);
  const [endH, endM] = dayHours.end.split(":").map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes + duration <= endMinutes) {
    const slotStartH = Math.floor(currentMinutes / 60);
    const slotStartM = currentMinutes % 60;
    const slotEndMinutes = currentMinutes + duration;
    const slotEndH = Math.floor(slotEndMinutes / 60);
    const slotEndM = slotEndMinutes % 60;

    const slotStart = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`;
    const slotEnd = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`;

    // Check advance notice
    const slotDateTime = new Date(`${date}T${slotStart}:00`);
    const hoursUntilSlot =
      (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSlot >= advanceNotice) {
      // Check against busy slots
      const slotStartMs = new Date(`${date}T${slotStart}:00`).getTime();
      const slotEndMs = new Date(`${date}T${slotEnd}:00`).getTime();

      const isConflict = busySlots.some((busy) => {
        const busyStart = new Date(busy.start).getTime();
        const busyEnd = new Date(busy.end).getTime();
        return slotStartMs < busyEnd && slotEndMs > busyStart;
      });

      if (!isConflict) {
        slots.push({ start: slotStart, end: slotEnd });
      }
    }

    currentMinutes += duration + breakTime;
  }

  return NextResponse.json({ slots, duration });
}

/**
 * Add minutes to a HH:MM time string, returning a new HH:MM string.
 */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}
