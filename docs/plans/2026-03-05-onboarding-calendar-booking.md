# Onboarding, Calendar Sync, Booking & Client Portal — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Google-powered onboarding, bidirectional calendar sync, public booking links, client self-service portal, WhatsApp reminders, and onboarding-aware empty states.

**Architecture:** Google OAuth for both therapists (via Supabase Auth provider) and clients (standalone OAuth on booking page). Calendar sync uses the `googleapis` npm package directly — freebusy for availability, events for read/write. All new tables in Supabase with RLS. Public booking pages are outside the `(dashboard)` route group.

**Tech Stack:** Next.js 16 App Router, Supabase (auth + postgres + RLS), Google Calendar API (`googleapis`), Google People API (contacts), Tailwind CSS v4 + shadcn/ui, Phosphor Icons, date-fns, react-hook-form + zod, sonner (toasts).

**Design doc:** `docs/plans/2026-03-05-onboarding-calendar-booking-design.md`

---

## Task 0: Install dependencies & set up Google OAuth in Supabase

**Files:**
- Modify: `package.json` (add `googleapis`)
- Create: `src/lib/google.ts` (Google API client factory)

**Steps:**

1. Install `googleapis`:
   ```bash
   npm install googleapis
   ```

2. In the Supabase dashboard, enable the Google OAuth provider:
   - Go to **Authentication > Providers > Google**
   - Enable it
   - Add Google OAuth Client ID and Client Secret (from Google Cloud Console)
   - Set scopes: `openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/contacts.readonly`
   - Set redirect URL to `https://gjwtodgmvtlvuckcqhch.supabase.co/auth/v1/callback`

3. In Google Cloud Console:
   - Create OAuth 2.0 credentials (Web application)
   - Add authorized redirect URI: `https://gjwtodgmvtlvuckcqhch.supabase.co/auth/v1/callback`
   - Add `http://localhost:3000/api/auth/callback` for local dev
   - Enable Calendar API and People API

4. Add env vars to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=<from-google-console>
   GOOGLE_CLIENT_SECRET=<from-google-console>
   ```

5. Create `src/lib/google.ts`:
   ```typescript
   import { google } from "googleapis";

   export function createGoogleClient(accessToken: string) {
     const auth = new google.auth.OAuth2();
     auth.setCredentials({ access_token: accessToken });
     return {
       calendar: google.calendar({ version: "v3", auth }),
       people: google.people({ version: "v1", auth }),
     };
   }
   ```

6. Commit:
   ```bash
   git add package.json package-lock.json src/lib/google.ts
   git commit -m "feat: add googleapis dependency and Google API client factory"
   ```

---

## Task 1: Database schema — new tables + RLS

**Files:**
- Create: `supabase/migrations/001_core_tables.sql`
- Create: `supabase/migrations/002_onboarding_tables.sql`

The core tables from the master plan (`clients`, `sessions`, `transactions`, `client_payments`, `session_payments`, `invoices`) don't exist in the database yet. We need them plus the new onboarding tables.

**Steps:**

1. Create `supabase/migrations/001_core_tables.sql` with the core schema from `therapy-accounting.md`:
   ```sql
   -- Clients
   create table public.clients (
     id serial primary key,
     user_id uuid references auth.users(id) not null,
     name text not null,
     phone text,
     email text,
     current_rate numeric,
     notes text,
     is_active boolean not null default true,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   );

   alter table public.clients enable row level security;
   create policy "Users can manage own clients" on public.clients
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- Sessions
   create type public.session_status as enum ('scheduled', 'confirmed', 'cancelled', 'no_show');

   create table public.sessions (
     id serial primary key,
     user_id uuid references auth.users(id) not null,
     client_id integer references public.clients(id) not null,
     date date not null,
     start_time time,
     end_time time,
     duration_minutes integer,
     rate numeric,
     status public.session_status not null default 'scheduled',
     is_chargeable boolean not null default true,
     source text,
     google_event_id text,
     notes text,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   );

   alter table public.sessions enable row level security;
   create policy "Users can manage own sessions" on public.sessions
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- Transactions
   create table public.transactions (
     id serial primary key,
     user_id uuid references auth.users(id) not null,
     date date not null,
     narration text,
     amount numeric not null,
     balance numeric,
     reference text,
     category text,
     is_personal boolean default false,
     source text,
     bank_file text,
     data_issues text,
     created_at timestamptz not null default now()
   );

   alter table public.transactions enable row level security;
   create policy "Users can manage own transactions" on public.transactions
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- Client Payments (transaction → client junction)
   create table public.client_payments (
     id serial primary key,
     user_id uuid references auth.users(id) not null,
     transaction_id integer references public.transactions(id) not null,
     client_id integer references public.clients(id) not null,
     amount numeric not null,
     created_at timestamptz not null default now()
   );

   alter table public.client_payments enable row level security;
   create policy "Users can manage own client_payments" on public.client_payments
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- Session Payments (transaction → session junction)
   create table public.session_payments (
     id serial primary key,
     user_id uuid references auth.users(id) not null,
     transaction_id integer references public.transactions(id) not null,
     session_id integer references public.sessions(id) not null,
     amount numeric not null,
     created_at timestamptz not null default now()
   );

   alter table public.session_payments enable row level security;
   create policy "Users can manage own session_payments" on public.session_payments
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- Invoices
   create type public.invoice_status as enum ('draft', 'sent', 'paid');

   create table public.invoices (
     id serial primary key,
     user_id uuid references auth.users(id) not null,
     invoice_number integer,
     client_id integer references public.clients(id) not null,
     date date not null,
     amount numeric not null,
     description text,
     status public.invoice_status not null default 'draft',
     pdf_path text,
     created_at timestamptz not null default now()
   );

   alter table public.invoices enable row level security;
   create policy "Users can manage own invoices" on public.invoices
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- Therapists (practice roster)
   create table public.therapists (
     id serial primary key,
     user_id uuid references auth.users(id) not null,
     name text not null,
     email text,
     phone text,
     slug text unique,
     is_active boolean not null default true,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   );

   alter table public.therapists enable row level security;
   create policy "Users can manage own therapists" on public.therapists
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```

2. Create `supabase/migrations/002_onboarding_tables.sql`:
   ```sql
   -- Therapist settings (availability, booking config, Google connection)
   create table public.therapist_settings (
     id serial primary key,
     user_id uuid references auth.users(id) not null unique,
     therapist_id integer references public.therapists(id),
     google_calendar_id text,
     google_refresh_token text,
     booking_slug text unique,
     session_duration_minutes integer not null default 50,
     break_between_minutes integer not null default 10,
     advance_notice_hours integer not null default 4,
     cancellation_window_hours integer not null default 24,
     working_hours jsonb not null default '{
       "mon": {"start": "09:00", "end": "18:00", "enabled": true},
       "tue": {"start": "09:00", "end": "18:00", "enabled": true},
       "wed": {"start": "09:00", "end": "18:00", "enabled": true},
       "thu": {"start": "09:00", "end": "18:00", "enabled": true},
       "fri": {"start": "09:00", "end": "18:00", "enabled": true},
       "sat": {"start": "09:00", "end": "13:00", "enabled": false},
       "sun": {"start": "09:00", "end": "13:00", "enabled": false}
     }'::jsonb,
     outbound_sync_enabled boolean not null default true,
     onboarding_completed boolean not null default false,
     practice_name text,
     practice_address text,
     practice_phone text,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   );

   alter table public.therapist_settings enable row level security;
   create policy "Users can manage own settings" on public.therapist_settings
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- Bookings (client-initiated, links to sessions)
   create table public.bookings (
     id serial primary key,
     therapist_user_id uuid references auth.users(id) not null,
     session_id integer references public.sessions(id),
     client_name text not null,
     client_email text not null,
     client_phone text,
     google_event_id text,
     booked_at timestamptz not null default now(),
     cancelled_at timestamptz
   );

   alter table public.bookings enable row level security;
   -- Therapist can see their bookings
   create policy "Therapist can manage own bookings" on public.bookings
     for all using (auth.uid() = therapist_user_id)
     with check (auth.uid() = therapist_user_id);
   -- Public can insert bookings (for the booking page)
   create policy "Anyone can create bookings" on public.bookings
     for insert with check (true);
   -- Clients can view their own bookings by email
   create policy "Clients can view own bookings" on public.bookings
     for select using (client_email = current_setting('request.jwt.claims', true)::json->>'email');
   ```

3. Apply migrations via Supabase dashboard (SQL editor) or CLI.

4. Generate TypeScript types:
   ```bash
   npx supabase gen types typescript --project-id gjwtodgmvtlvuckcqhch > src/lib/database.types.ts
   ```
   If the CLI isn't set up, manually create the types file matching the schema above.

5. Commit:
   ```bash
   git add supabase/ src/lib/database.types.ts
   git commit -m "feat: add core + onboarding database schema with RLS"
   ```

---

## Task 2: Google OAuth sign-in for therapists

**Files:**
- Modify: `src/app/login/page.tsx` (add "Sign in with Google" button)
- Create: `src/app/api/auth/callback/route.ts` (OAuth callback handler)
- Modify: `src/middleware.ts` (allow `/book`, `/my-appointments`, `/api` routes)

**Steps:**

1. Update `src/middleware.ts` to allow public routes:
   ```typescript
   // Add to the redirect condition — skip auth for public routes
   const publicPaths = ["/login", "/book", "/my-appointments", "/api/auth", "/api/calendar/availability"];
   const isPublicPath = publicPaths.some(p => request.nextUrl.pathname.startsWith(p));

   if (!user && !isPublicPath) {
     // redirect to /login
   }
   ```

2. Create `src/app/api/auth/callback/route.ts`:
   ```typescript
   import { createClient } from "@/lib/supabase/server";
   import { NextResponse } from "next/server";

   export async function GET(request: Request) {
     const { searchParams, origin } = new URL(request.url);
     const code = searchParams.get("code");
     const next = searchParams.get("next") ?? "/";

     if (code) {
       const supabase = await createClient();
       const { error } = await supabase.auth.exchangeCodeForSession(code);
       if (!error) {
         return NextResponse.redirect(`${origin}${next}`);
       }
     }

     return NextResponse.redirect(`${origin}/login?error=auth_failed`);
   }
   ```

3. Update `src/app/login/page.tsx` — add Google sign-in button alongside email/password:
   ```typescript
   async function handleGoogleSignIn() {
     const { error } = await supabase.auth.signInWithOAuth({
       provider: "google",
       options: {
         scopes: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/contacts.readonly",
         redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding`,
         queryParams: {
           access_type: "offline",
           prompt: "consent",
         },
       },
     });
   }
   ```
   Add a divider "or" between email form and Google button. Google button uses outline variant.

4. Commit:
   ```bash
   git add src/app/login/page.tsx src/app/api/auth/callback/route.ts src/middleware.ts
   git commit -m "feat: add Google OAuth sign-in for therapists"
   ```

---

## Task 3: Onboarding wizard — welcome + calendar selection

**Files:**
- Create: `src/app/onboarding/page.tsx` (multi-step wizard)
- Create: `src/app/onboarding/layout.tsx` (minimal layout, no sidebar)
- Create: `src/lib/google-calendar.ts` (calendar list + event fetch helpers)
- Create: `src/app/api/calendar/list/route.ts` (list user's calendars)
- Create: `src/app/api/calendar/events/route.ts` (fetch events from selected calendar)

**Steps:**

1. Create `src/app/onboarding/layout.tsx` — minimal centered layout (like login), no sidebar. Only accessible to authenticated users.

2. Create `src/lib/google-calendar.ts` with helpers:
   - `listCalendars(accessToken)` — calls `calendar.calendarList.list()`
   - `getRecentEvents(accessToken, calendarId, daysBack)` — calls `calendar.events.list()` for last N days
   - `getFreeBusy(accessToken, calendarId, timeMin, timeMax)` — calls `calendar.freebusy.query()`

3. Create `src/app/api/calendar/list/route.ts`:
   - GET handler: get user's session from Supabase, extract `provider_token` (Google access token)
   - Call `listCalendars()` and return JSON

4. Create `src/app/api/calendar/events/route.ts`:
   - GET handler with `?calendarId=` query param
   - Call `getRecentEvents()` for last 30 days
   - Return events as JSON

5. Create `src/app/onboarding/page.tsx` — client component, multi-step:
   - **Step 1 (Welcome):** "Let's set up your practice." CTA: "Connect Google Account" (if not already connected via OAuth) or auto-advance if they signed in with Google. "Skip for now" link → redirects to `/`.
   - **Step 2 (Select Calendar):** Fetch `/api/calendar/list`, show radio list of calendars. "Next" button saves selected calendar ID.
   - **Step 3 (Import Clients):** Next task handles this.
   - **Step 4 (Done):** "You're all set!" with summary of what was imported. CTA → Dashboard.

   Use a `step` state variable (1–4). Each step is a section that transitions with a simple fade. Notion-like: white, minimal, generous spacing.

6. Commit:
   ```bash
   git add src/app/onboarding/ src/lib/google-calendar.ts src/app/api/calendar/
   git commit -m "feat: onboarding wizard with calendar selection"
   ```

---

## Task 4: Onboarding wizard — import clients from Google Contacts

**Files:**
- Create: `src/lib/google-contacts.ts` (contacts fetch helper)
- Create: `src/app/api/contacts/route.ts` (list user's contacts)
- Modify: `src/app/onboarding/page.tsx` (add Step 3: contact selection)
- Create: `src/app/api/clients/import/route.ts` (create clients from selected contacts)

**Steps:**

1. Create `src/lib/google-contacts.ts`:
   - `listContacts(accessToken)` — calls `people.people.connections.list()` with `personFields: "names,emailAddresses,phoneNumbers"`. Returns array of `{ name, email, phone }`.

2. Create `src/app/api/contacts/route.ts`:
   - GET: fetch contacts, also fetch calendar events (from selected calendar stored in session/state). Cross-reference event attendee emails with contact emails. Return contacts sorted: those matching attendees first (pre-checked).

3. Add Step 3 to `src/app/onboarding/page.tsx`:
   - Fetch `/api/contacts`
   - Show a scrollable list with checkboxes. Each row: name, email, phone.
   - Contacts matching calendar attendees are pre-checked and sorted to top with a subtle "Appeared in your calendar" badge.
   - "Import Selected" button → POST to `/api/clients/import`
   - "Skip" link to advance without importing.

4. Create `src/app/api/clients/import/route.ts`:
   - POST: receive array of `{ name, email, phone }`, create client rows in Supabase for the authenticated user.
   - Return created client count.

5. After import, also save `therapist_settings` row (calendar ID, refresh token, onboarding_completed=true) and create a `therapists` row for the logged-in user.

6. Commit:
   ```bash
   git add src/lib/google-contacts.ts src/app/api/contacts/ src/app/api/clients/ src/app/onboarding/
   git commit -m "feat: onboarding step 3 — import clients from Google Contacts"
   ```

---

## Task 5: Calendar sync — inbound (GCal → therapybooks sessions)

**Files:**
- Create: `src/app/api/calendar/sync/route.ts` (trigger sync)
- Create: `src/lib/calendar-sync.ts` (sync logic: events → sessions)
- Modify: `src/lib/google-calendar.ts` (add event-to-session mapper)

**Steps:**

1. Create `src/lib/calendar-sync.ts`:
   - `syncCalendarEvents(supabase, userId, accessToken, calendarId)`:
     - Fetch events from GCal for last 30 days
     - For each event, check if `google_event_id` already exists in sessions table (dedup)
     - Match attendee emails to existing clients
     - Create session rows with `status: 'scheduled'`, `source: 'calendar_import'`
     - Return `{ created: number, skipped: number, unmatched: number }`

2. Create `src/app/api/calendar/sync/route.ts`:
   - POST handler: get user session, get their `therapist_settings` (calendar ID, refresh token)
   - Refresh access token if needed using `google.auth.OAuth2.refreshAccessToken()`
   - Call `syncCalendarEvents()`
   - Return sync results

3. The sync should handle:
   - Events with no attendees (solo events — skip or create without client)
   - All-day events (skip — not therapy sessions)
   - Recurring events (each instance is a separate event from the API)
   - Already-imported events (skip by `google_event_id`)

4. Commit:
   ```bash
   git add src/lib/calendar-sync.ts src/app/api/calendar/sync/
   git commit -m "feat: inbound calendar sync — GCal events to sessions"
   ```

---

## Task 6: Calendar sync — outbound (therapybooks → GCal)

**Files:**
- Modify: `src/lib/google-calendar.ts` (add `createEvent`, `updateEvent`, `deleteEvent`)
- Create: `src/lib/calendar-push.ts` (push session changes to GCal)

**Steps:**

1. Add to `src/lib/google-calendar.ts`:
   - `createCalendarEvent(accessToken, calendarId, event)` — POST to GCal
   - `updateCalendarEvent(accessToken, calendarId, eventId, event)` — PATCH
   - `deleteCalendarEvent(accessToken, calendarId, eventId)` — DELETE

2. Create `src/lib/calendar-push.ts`:
   - `pushSessionToCalendar(supabase, userId, sessionId)`:
     - Load session + client details from Supabase
     - Check if `outbound_sync_enabled` in therapist_settings
     - If session has no `google_event_id`, create event and save the ID back
     - If session already has `google_event_id`, update it
     - Event format: summary = client name, start/end from session times, description = session notes

3. This will be called from session creation/update actions (built in later tasks).

4. Commit:
   ```bash
   git add src/lib/google-calendar.ts src/lib/calendar-push.ts
   git commit -m "feat: outbound calendar sync — push sessions to GCal"
   ```

---

## Task 7: Settings page — availability & Google connection

**Files:**
- Rewrite: `src/app/(dashboard)/settings/page.tsx` (full settings UI)
- Create: `src/app/(dashboard)/settings/availability-form.tsx` (working hours form)
- Create: `src/app/(dashboard)/settings/google-connection.tsx` (connection status + disconnect)
- Create: `src/app/(dashboard)/settings/booking-link.tsx` (display + copy)
- Create: `src/app/api/settings/route.ts` (GET + PUT therapist_settings)

**Steps:**

1. Create `src/app/api/settings/route.ts`:
   - GET: return therapist_settings for authenticated user (create default row if none exists)
   - PUT: update therapist_settings

2. Create `src/app/(dashboard)/settings/availability-form.tsx` — client component:
   - Working hours: 7-row grid (Mon–Sun), each with enable toggle, start time, end time
   - Session duration (number input, minutes)
   - Break between sessions (number input, minutes)
   - Minimum advance notice (number input, hours)
   - Cancellation window (number input, hours)
   - Save button → PUT `/api/settings`
   - Use react-hook-form + zod for validation

3. Create `src/app/(dashboard)/settings/google-connection.tsx`:
   - Show connection status (connected email or "Not connected")
   - If connected: "Sync Now" button (POST `/api/calendar/sync`), last sync time, "Disconnect" button
   - If not connected: "Connect Google Account" button
   - Toggle: "Push new sessions to Google Calendar" (outbound_sync_enabled)

4. Create `src/app/(dashboard)/settings/booking-link.tsx`:
   - Show booking URL: `{origin}/book/{slug}`
   - Copy button (copies to clipboard, sonner toast)
   - Slug is auto-generated from therapist name but editable

5. Rewrite `src/app/(dashboard)/settings/page.tsx`:
   - Sections: Practice Profile, Availability, Google Calendar, Booking Link
   - Each section separated by a subtle divider
   - Notion-like: section headers as `text-sm font-medium uppercase tracking-wide text-muted-foreground`

6. Commit:
   ```bash
   git add src/app/(dashboard)/settings/ src/app/api/settings/
   git commit -m "feat: settings page with availability, Google connection, booking link"
   ```

---

## Task 8: Public booking page (`/book/[slug]`)

**Files:**
- Create: `src/app/book/[slug]/page.tsx` (public booking page)
- Create: `src/app/book/[slug]/layout.tsx` (minimal public layout)
- Create: `src/app/api/calendar/availability/route.ts` (compute available slots)
- Create: `src/app/api/bookings/route.ts` (create booking)
- Create: `src/components/booking/slot-picker.tsx` (date + time slot selector)
- Create: `src/components/booking/booking-form.tsx` (client details form)

**Steps:**

1. Create `src/app/api/calendar/availability/route.ts`:
   - GET with `?slug=<slug>&date=<YYYY-MM-DD>`:
     - Look up therapist by slug → get their settings (working hours, duration, break, advance notice)
     - Query Google freebusy for that date
     - Compute available slots: working hours minus busy blocks, accounting for break time and advance notice
     - Return array of `{ start: "HH:mm", end: "HH:mm" }`

2. Create `src/components/booking/slot-picker.tsx` — client component:
   - Date picker (using the shadcn calendar component) — disable past dates and dates beyond a reasonable window (e.g. 30 days)
   - When date selected, fetch `/api/calendar/availability?slug=...&date=...`
   - Show available time slots as a grid of buttons
   - Selected slot highlighted

3. Create `src/components/booking/booking-form.tsx`:
   - If not signed in with Google: "Sign in with Google to book" button + manual form (name, email, phone)
   - If signed in: pre-fill name/email from Google profile, optional phone field
   - "Book Appointment" button → POST `/api/bookings`

4. Create `src/app/api/bookings/route.ts`:
   - POST: create booking row, create session row (status: scheduled), push event to therapist's GCal (outbound sync)
   - Return success with appointment details

5. Create `src/app/book/[slug]/layout.tsx` — minimal layout: white bg, centered, therapist name at top, no sidebar.

6. Create `src/app/book/[slug]/page.tsx`:
   - Server component: look up therapist by slug, pass details to client components
   - Render: therapist name, practice name, session duration, slot picker, booking form
   - After booking: confirmation screen with "Add to your calendar" link (Google Calendar event link)

7. Commit:
   ```bash
   git add src/app/book/ src/app/api/calendar/availability/ src/app/api/bookings/ src/components/booking/
   git commit -m "feat: public booking page with slot picker and Google sign-in"
   ```

---

## Task 9: Client portal (`/my-appointments`)

**Files:**
- Create: `src/app/my-appointments/page.tsx` (client self-service)
- Create: `src/app/my-appointments/layout.tsx` (minimal layout)
- Create: `src/app/api/client-portal/appointments/route.ts` (list client's appointments)
- Create: `src/app/api/client-portal/cancel/route.ts` (cancel appointment)
- Create: `src/app/api/client-portal/reschedule/route.ts` (reschedule appointment)
- Create: `src/app/api/client-portal/payments/route.ts` (view payment history)

**Steps:**

1. Client auth: The client signs in with Google on the booking page. We identify them by email. The portal shows appointments across all therapists they've booked with.

2. Create API routes:
   - `GET /api/client-portal/appointments` — fetch bookings where `client_email` matches the signed-in user's email, join with sessions for status/time details
   - `POST /api/client-portal/cancel` — cancel a booking if within cancellation window. Update session status to 'cancelled', delete GCal event.
   - `POST /api/client-portal/reschedule` — cancel old + create new booking for a different slot
   - `GET /api/client-portal/payments` — fetch client_payments where the client's email matches

3. Create `src/app/my-appointments/layout.tsx` — minimal public layout with "My Appointments" header and sign-out.

4. Create `src/app/my-appointments/page.tsx` — client component:
   - If not signed in: "Sign in with Google to view your appointments"
   - If signed in: tabs for "Upcoming" and "Past"
   - Upcoming: list of sessions with date, time, therapist name, status. "Cancel" and "Reschedule" buttons (disabled if outside cancellation window with tooltip explaining why).
   - Past: list of past sessions with date, time, status
   - Payment History section: table of payments with date, amount, running balance
   - Notion-like styling consistent with rest of app

5. Commit:
   ```bash
   git add src/app/my-appointments/ src/app/api/client-portal/
   git commit -m "feat: client self-service portal with cancel/reschedule"
   ```

---

## Task 10: Dashboard — Appointments Today + WhatsApp reminders

**Files:**
- Rewrite: `src/app/(dashboard)/page.tsx` (real dashboard with data)
- Create: `src/components/dashboard/appointments-today.tsx` (today's sessions + send reminder)
- Create: `src/components/dashboard/stat-cards.tsx` (live stats from DB)
- Create: `src/components/dashboard/onboarding-prompt.tsx` (pre-connection CTA)
- Create: `src/app/api/dashboard/route.ts` (dashboard data endpoint)

**Steps:**

1. Create `src/app/api/dashboard/route.ts`:
   - GET: return all dashboard data for authenticated user:
     - Today's sessions (joined with clients for name, phone, location)
     - Stats: active client count, sessions this month, revenue this month (sum of confirmed session rates), outstanding balances
     - `onboarding_completed` flag from therapist_settings

2. Create `src/components/dashboard/stat-cards.tsx`:
   - 4 stat cards (same layout as current shells but with real numbers)
   - Tabular nums for all values, INR formatting

3. Create `src/components/dashboard/appointments-today.tsx`:
   - List of today's sessions: time, client name, location/meet link
   - "Send Reminder" button per row:
     - If client has phone: opens `https://wa.me/<phone>?text=<encoded>` in new tab
     - Pre-drafted: "Hi [name], this is a reminder about your appointment today at [time] at [location]. Looking forward to seeing you!"
     - If no phone: button disabled, tooltip "No phone number on file"
   - Use `WhatsappLogo` icon from Phosphor (add to icons barrel export)

4. Create `src/components/dashboard/onboarding-prompt.tsx`:
   - Shown when `onboarding_completed` is false
   - Card: "Connect your Google account to see your schedule, clients, and sessions here."
   - CTA: "Connect Google Account" → redirects to Google OAuth flow
   - "Skip for now" link dismisses the card

5. Rewrite `src/app/(dashboard)/page.tsx`:
   - Fetch dashboard data on server side
   - If not onboarded: show onboarding prompt + empty stat cards
   - If onboarded: show stat cards + appointments today section
   - If no bank statement imported yet: show prompt card below appointments

6. Commit:
   ```bash
   git add src/app/(dashboard)/page.tsx src/components/dashboard/ src/app/api/dashboard/
   git commit -m "feat: live dashboard with appointments today and WhatsApp reminders"
   ```

---

## Task 11: Update all empty states to be onboarding-aware

**Files:**
- Modify: `src/app/(dashboard)/clients/page.tsx`
- Modify: `src/app/(dashboard)/sessions/page.tsx`
- Modify: `src/app/(dashboard)/transactions/page.tsx`
- Modify: `src/app/(dashboard)/invoices/page.tsx`
- Modify: `src/app/(dashboard)/therapists/page.tsx`
- Create: `src/components/empty-state.tsx` (reusable empty state component)

**Steps:**

1. Create `src/components/empty-state.tsx` — reusable component:
   ```typescript
   interface EmptyStateProps {
     icon: React.ComponentType<{ className?: string }>;
     title: string;
     description: string;
     action?: { label: string; href?: string; onClick?: () => void; variant?: "default" | "outline" };
     secondaryAction?: { label: string; href?: string; onClick?: () => void };
   }
   ```
   Renders centered content with icon, title, description, primary + optional secondary CTA. Notion-like: subtle, not overwhelming.

2. Update each page to check `onboarding_completed` (fetch from server) and show the appropriate empty state:
   - **Clients (pre-connection):** icon=Users, "Connect Google to import your client list from contacts, or add clients manually." CTAs: "Connect Google" (primary), "Add Client" (outline)
   - **Clients (post-connection, empty):** "No clients imported yet. Import from Google Contacts or add manually." CTAs: "Import from Contacts", "Add Client"
   - **Sessions (pre-connection):** icon=CalendarBlank, "Connect Google Calendar to automatically sync your sessions." CTA: "Connect Google Calendar"
   - **Sessions (post-connection, empty):** "No sessions found. Sessions will appear as you sync your calendar or clients book appointments."
   - **Transactions:** (always same) icon=ArrowsLeftRight, "Import a bank statement to see your transactions." CTA: "Import Statement"
   - **Invoices:** icon=FileText, "Create your first invoice after recording some sessions." CTA: "New Invoice" (outline)
   - **Therapists:** icon=UserCheck, "Add therapists to manage your practice roster." CTA: "Add Therapist"

3. Commit:
   ```bash
   git add src/components/empty-state.tsx src/app/(dashboard)/
   git commit -m "feat: onboarding-aware empty states for all pages"
   ```

---

## Task 12: Add WhatsappLogo to icons + final polish

**Files:**
- Modify: `src/components/ui/icons.tsx` (add WhatsappLogo, GoogleLogo, LinkSimple)
- Modify: `src/components/layout/sidebar.tsx` (add booking link nav item if configured)

**Steps:**

1. Add new icons to `src/components/ui/icons.tsx`:
   ```typescript
   export { WhatsappLogo, GoogleLogo, LinkSimple, Clock, MapPin } from "@phosphor-icons/react";
   ```

2. Optionally add a "Booking Link" item to the sidebar (below Therapists, above Settings) that appears only when a booking slug is configured. Uses the `LinkSimple` icon.

3. Run `npx tsc --noEmit` to verify no type errors.

4. Run `npm run lint` to verify no lint errors.

5. Commit:
   ```bash
   git add src/components/ui/icons.tsx src/components/layout/sidebar.tsx
   git commit -m "feat: add new icons and booking link in sidebar"
   ```

---

## Task 13: Final verification

**Steps:**

1. Run TypeScript check: `npx tsc --noEmit`
2. Run lint: `npm run lint`
3. Run build: `npx next build`
4. Manual smoke test:
   - Sign in with Google → onboarding flow
   - Select calendar → import contacts
   - Dashboard shows today's appointments
   - Settings page shows availability config
   - Booking link works (open in incognito)
   - Client portal shows appointments
5. Fix any issues found.
6. Final commit if needed.
