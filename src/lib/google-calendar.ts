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
