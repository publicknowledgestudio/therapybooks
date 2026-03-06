import { createGoogleClient } from "./google";

export async function listCalendars(accessToken: string) {
  const { calendar } = createGoogleClient(accessToken);
  const res = await calendar.calendarList.list();
  return (res.data.items ?? []).map((cal) => ({
    id: cal.id!,
    summary: cal.summary ?? "Untitled",
    primary: cal.primary ?? false,
  }));
}

export async function getRecentEvents(
  accessToken: string,
  calendarId: string,
  daysBack: number = 30,
) {
  const { calendar } = createGoogleClient(accessToken);
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - daysBack);

  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: new Date().toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 500,
  });

  return res.data.items ?? [];
}

export async function getFreeBusy(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
) {
  const { calendar } = createGoogleClient(accessToken);
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: calendarId }],
    },
  });

  return res.data.calendars?.[calendarId]?.busy ?? [];
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: string; // ISO datetime
    end: string; // ISO datetime
  },
): Promise<string | null> {
  const { calendar } = createGoogleClient(accessToken);
  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start },
      end: { dateTime: event.end },
    },
  });
  return res.data.id ?? null;
}

export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: {
    summary?: string;
    description?: string;
    start?: string;
    end?: string;
  },
): Promise<void> {
  const { calendar } = createGoogleClient(accessToken);
  const requestBody: Record<string, unknown> = {};
  if (event.summary) requestBody.summary = event.summary;
  if (event.description !== undefined)
    requestBody.description = event.description;
  if (event.start) requestBody.start = { dateTime: event.start };
  if (event.end) requestBody.end = { dateTime: event.end };

  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody,
  });
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const { calendar } = createGoogleClient(accessToken);
  await calendar.events.delete({ calendarId, eventId });
}
