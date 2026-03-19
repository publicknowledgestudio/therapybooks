export interface ChangelogEntry {
  id: string;
  date: string;
  title: string;
  description: string;
}

/**
 * App changelog — newest first.
 *
 * To add a new entry: increment the ID, add it to the top of the array.
 * Users who haven't seen it yet will get a "What's New" modal on their
 * next visit to the dashboard.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "008",
    date: "2026-03-19",
    title: "Calendar sync details",
    description:
      "After syncing your calendar, click 'See details' to view all events. Manually tag unmatched events to clients and optionally save their email for future auto-matching.",
  },
  {
    id: "007",
    date: "2026-03-19",
    title: "Dedicated booking page",
    description:
      "Booking link and availability settings now live on their own page, accessible from the sidebar.",
  },
  {
    id: "006",
    date: "2026-03-19",
    title: "Bank statement search and personal transactions",
    description:
      "Search transactions by narration, date, or client. Mark transactions as personal and show/hide them with one click.",
  },
  {
    id: "005",
    date: "2026-03-19",
    title: "Calendar timezone fix",
    description:
      "Appointment times from Google Calendar now display correctly in IST. Sync also uses your refresh token so it works even after the session expires.",
  },
  {
    id: "004",
    date: "2026-03-19",
    title: "Dashboard sync bar",
    description:
      "See when your calendar was last synced and sync again with one click, right above Today's Appointments.",
  },
  {
    id: "003",
    date: "2026-03-19",
    title: "Session payment tracking",
    description:
      "Payments are now allocated to individual sessions. See paid/unpaid status on each session in the client detail page.",
  },
  {
    id: "002",
    date: "2026-03-19",
    title: "Improved statement import",
    description:
      "The import flow is now a full page with inline client search. Match transactions to clients with a searchable dropdown.",
  },
  {
    id: "001",
    date: "2026-03-04",
    title: "Bank statement import",
    description:
      "Import HDFC bank statements and automatically match deposits to clients based on name and session rate.",
  },
];

export const LATEST_CHANGELOG_ID = CHANGELOG[0].id;

export function getUnseenEntries(lastSeenId: string | null): ChangelogEntry[] {
  if (!lastSeenId) return CHANGELOG;
  return CHANGELOG.filter((entry) => entry.id > lastSeenId);
}
