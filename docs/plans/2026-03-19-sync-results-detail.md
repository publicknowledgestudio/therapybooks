# Sync Results Detail View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After calendar sync, show a "See details" dialog with tabbed views of created/skipped/unmatched events. Unmatched events can be manually tagged to a client.

**Architecture:** Expand `SyncResult` to include event detail arrays alongside counts. The sync API returns the full result. CalendarSyncBar stores it in state and opens a `SyncResultsDialog` on "See details" click. The dialog uses Tabs (Unmatched/New/Already Imported). Unmatched rows have a ClientPicker for manual tagging. A new server action `tagUnmatchedEvent` creates the session.

**Tech Stack:** Next.js 15, Supabase, TypeScript, Radix Tabs, existing ClientPicker component

---

### Task 1: Expand SyncResult type with event details

**Files:**
- Modify: `src/lib/calendar-sync.ts`

**Step 1: Update the SyncResult interface and collect event details**

Replace the `SyncResult` interface and update the sync function to collect event details as it processes:

```typescript
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
```

In the sync function, change `result` init to:
```typescript
const result: SyncResult = { created: [], skipped: [], unmatched: [] };
```

For each event category, push a detail object instead of incrementing a counter. The detail object is built from the Google Calendar event data. For "skipped" events that are already imported or all-day/cancelled, push a minimal detail. For "created" events, include the matched client name. For "unmatched" events, include the first non-self attendee email.

Helper to extract detail from an event:
```typescript
function eventDetail(
  eventId: string,
  event: { summary?: string | null; start?: { dateTime?: string | null }; end?: { dateTime?: string | null }; attendees?: Array<{ email?: string | null; self?: boolean }> },
): SyncEventDetail {
  const startDt = event.start?.dateTime ? new Date(event.start.dateTime) : null;
  const endDt = event.end?.dateTime ? new Date(event.end.dateTime) : null;
  const istTime: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
  const istDate: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
  return {
    eventId,
    title: event.summary ?? "Untitled",
    date: startDt ? startDt.toLocaleDateString("en-CA", istDate) : "",
    startTime: startDt ? startDt.toLocaleTimeString("en-GB", istTime) : null,
    endTime: endDt ? endDt.toLocaleTimeString("en-GB", istTime) : null,
    attendeeEmail: (event.attendees ?? []).find(a => a.email && !a.self)?.email ?? null,
    clientName: null,
  };
}
```

Then at each push point:
- `result.skipped.push(...)` for already-imported, all-day, cancelled, no-start, and insert-error events
- `result.unmatched.push(...)` for unmatched events
- `result.created.push({ ...detail, clientName })` for created events

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git commit -m "feat: expand SyncResult to include event details"
```

---

### Task 2: Update API route and CalendarSyncBar to handle detailed results

**Files:**
- Modify: `src/app/api/calendar/sync/route.ts` (no changes needed — it already returns `result` directly)
- Modify: `src/components/dashboard/calendar-sync-bar.tsx`

**Step 1: Update CalendarSyncBar to store sync results and show "See details"**

The sync bar needs to:
1. Store the full sync result in state
2. Show a "See details" link in the toast or next to the sync bar after sync completes
3. Open a dialog when clicked

Update `CalendarSyncBar`:
- Add state: `const [syncResult, setSyncResult] = useState<SyncResult | null>(null)`
- After successful sync, store `data` in `setSyncResult(data)`
- Change toast to include counts (computed from array lengths)
- Add a "See details" button that appears when `syncResult` is set
- Import and render `SyncResultsDialog` (created in Task 3)

The counts are now `data.created.length`, `data.skipped.length`, `data.unmatched.length`.

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git commit -m "feat: store sync results and show See Details button"
```

---

### Task 3: Create SyncResultsDialog with tabs

**Files:**
- Create: `src/components/dashboard/sync-results-dialog.tsx`

**Step 1: Create the dialog component**

A dialog with 3 tabs using Radix Tabs component:
- **Unmatched** (default): Table with event title, date, time, attendee email, and a ClientPicker
- **New**: Table with event title, date, time, client name
- **Already Imported**: Table with event title, date, time

Each tab header shows the count as a badge.

The Unmatched tab rows each have:
- Event title, date, time range, attendee email
- A ClientPicker (reuse from `src/components/transactions/client-picker.tsx`) with no suggestions (just the search)
- A "Tag" button that calls the `tagUnmatchedEvent` server action

Props:
```typescript
interface SyncResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: SyncResult;
  allClients: Array<{ id: number; name: string }>;
  onTagged: () => void; // called after successful tag to refresh
}
```

The `allClients` list needs to be fetched. We can fetch it when the dialog opens — add a `fetchClients` call in CalendarSyncBar alongside the sync, or lazy-load in the dialog.

Simplest: CalendarSyncBar calls `fetchClients()` (already exists in statement/actions.ts) alongside the sync and passes the list to the dialog.

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git commit -m "feat: add SyncResultsDialog with tabbed event views"
```

---

### Task 4: Add tagUnmatchedEvent server action

**Files:**
- Modify: `src/app/(dashboard)/dashboard/actions.ts`

**Step 1: Add the server action**

```typescript
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
  // Auth check
  // Fetch client's current_rate and default_session_rate for the rate
  // Calculate duration from start/end times
  // Insert session with google_event_id, source: "calendar_import"
  // If updateClientEmail && attendeeEmail, update client's email
  // revalidatePath("/dashboard")
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git commit -m "feat: add tagUnmatchedEvent server action"
```

---

### Task 5: Wire everything together and test

**Step 1: Verify the full flow**

1. Click "Sync Now" on dashboard
2. After sync completes, "See details" button appears
3. Click it — dialog opens on Unmatched tab
4. Pick a client for an unmatched event, click "Tag"
5. Session is created, event disappears from unmatched list
6. Switch to New and Already Imported tabs — events display correctly
7. Close dialog, refresh — tagged event now shows in Today's Appointments if it's today

**Step 2: Commit any fixes**

```bash
git commit -m "fix: polish sync results dialog"
```
