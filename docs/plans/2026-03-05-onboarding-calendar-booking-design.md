# Onboarding, Calendar Sync, Booking & Client Portal — Design

**Date**: 2026-03-05
**Status**: Approved

---

## Problem

The app currently shows dead-end empty states ("No clients yet.") that give a new therapist zero reason to push through the work of entering data. Without an immediate payoff, they'll close the tab and never come back.

## Solution Overview

Three interconnected features that make the app useful from minute one:

1. **Onboarding flow** — Google account connection as a single gateway that imports calendar events (sessions) and contacts (clients) in one step.
2. **Bidirectional Google Calendar sync** — Read events in, push new sessions out. Enables availability-based booking.
3. **Public booking link + client portal** — Clients self-book, self-manage, and see their own history. Reduces no-shows.

---

## 1. Onboarding Flow

### First-time experience (after sign-up)

1. **Welcome screen** — "Let's set up your practice." Single CTA: **Connect Google Account**. Small "Skip for now" link below.
2. **Select calendar** — Show all Google Calendars, therapist picks which one contains therapy sessions. Pull last 30 days of events for instant data.
3. **Import clients** — Show Google Contacts list with checkboxes. Contacts whose emails appear as calendar event attendees are pre-checked and sorted to top. Therapist opts in per contact. Each checked contact becomes a client (name, email, phone pre-filled).
4. **Done → Dashboard** — Lands on dashboard with real data. Dashboard prompts next step: "Import a bank statement to start tracking payments."

### Skip behavior

If therapist skips Google connection, they land on the dashboard. Each empty-state card becomes a contextual onboarding prompt (see Section 4).

### OAuth scopes

- `calendar.readonly` — read events for sync
- `calendar.events` — write events for booking/outbound sync
- `contacts.readonly` — import client contact info

Refresh token stored encrypted in Supabase. Access token refreshed server-side.

---

## 2. Google Calendar Integration

### Inbound sync (GCal → therapybooks)

- Pull events from the selected calendar
- Match attendees to clients by email
- Unmatched events surface for manual client assignment
- Sessions created as "unconfirmed" until therapist reviews
- Runs on login + manual "Sync now" button

### Outbound sync (therapybooks → GCal)

- When a client books via booking link, or therapist creates a session manually, push a calendar event to Google
- Therapist can toggle outbound sync on/off in Settings

### Availability (for booking link)

- Query Google freebusy endpoint against therapist's calendar
- Subtract busy blocks from working hours to compute open slots
- Working hours, session duration, break time, and advance notice are all configurable

---

## 3. Booking Link & Client Portal

### Therapist availability settings (Settings page)

- Working hours per day of week (e.g. Mon–Fri 9am–6pm, Sat 9am–1pm)
- Session duration (default: 50 min)
- Break between sessions (configurable, default: 10 min)
- Minimum advance notice for booking (configurable, e.g. 4 hours)
- Cancellation/reschedule policy window (e.g. 24 hours before)

### Public booking page (`/book/<therapist-slug>`)

- Public, no auth required to view available slots
- Slots computed from: working hours minus Google Calendar busy blocks, respecting break time and advance notice
- To book: client signs in with Google (gives us name, email; we request contacts.readonly for phone if available)
- Booking form also has optional phone number field as fallback
- On booking: create session in therapybooks + push event to therapist's GCal
- Per-therapist links (each therapist gets their own slug)

### Client portal (`/my-appointments`, behind Google sign-in)

Full self-service:

- View upcoming appointments
- Cancel or reschedule within the therapist's policy window
- View past sessions
- View payment/balance history

### Phone number collection (for WhatsApp reminders)

Three sources, in priority order:
1. Google Contacts import (during therapist onboarding)
2. Booking form (optional phone field when client books)
3. Manual entry by therapist

---

## 4. Empty States (Onboarding-Aware)

Every empty state has two modes: **pre-Google-connection** and **post-Google-connection**.

### Dashboard

**Pre-connection:**
- Hero prompt: "Connect your Google account to see your schedule, clients, and sessions here."
- CTA: "Connect Google Account"
- Stat cards show "—" with muted labels

**Post-connection (but no bank statement):**
- Appointments Today section populated from calendar
- Stat cards show real session/client counts
- Prompt card: "Import a bank statement to start tracking payments."

**Appointments Today section** (always visible post-connection):
- Each row: client name, time, location/Google Meet link
- "Send Reminder" button → opens `https://wa.me/<phone>?text=<encoded-message>` in new tab
- Pre-drafted message: "Hi [name], this is a reminder about your appointment today at [time] at [location/Meet link]. Looking forward to seeing you!"
- Button disabled with "No phone number" tooltip if phone is missing

### Clients page

**Pre-connection:** "Connect Google to import your client list from contacts, or add clients manually."
Two CTAs: "Connect Google" (primary), "Add Client" (secondary/outline)

**Post-connection, no clients:** "No clients imported yet. Import from Google Contacts or add manually."
CTAs: "Import from Contacts", "Add Client"

### Sessions page

**Pre-connection:** "Connect Google Calendar to automatically sync your sessions."
CTA: "Connect Google Calendar"

**Post-connection, no sessions:** "No sessions found in your calendar. Sessions will appear here as you sync your calendar or clients book appointments."

### Transactions page

Always the same (not Google-dependent):
"Import a bank statement to see your transactions."
CTA: "Import Statement"

### Invoices page

"Create your first invoice after recording some sessions."
CTA: "New Invoice" (outline/secondary)

### Therapists page

"Add therapists to manage your practice roster."
CTA: "Add Therapist"

### Settings page

Replaces "Settings coming soon" with actual content:
- Practice profile (name, address, phone)
- Availability settings (working hours, session duration, break time, advance notice, cancellation window)
- Google Calendar connection status + disconnect option
- Booking link display + copy button

---

## 5. "Fewer No-Shows" Pitch

The combination of features creates a no-show reduction story:

- **Self-service booking** — clients commit by signing in and choosing a slot
- **Calendar events on both sides** — appointment exists in client's Google Calendar too
- **Self-service reschedule** — clients reschedule instead of ghosting (within policy window)
- **WhatsApp reminders** — one-tap reminder from the dashboard on appointment day
- **Balance visibility** — client portal shows their payment history, creating accountability

---

## Tech Approach

- **Google Calendar API** (googleapis npm package) — free, 1M queries/day, no licensing concerns
- **Google OAuth** via Supabase Auth (therapist sign-in) + standalone Google OAuth for client booking sign-in
- **No third-party scheduling library** — we build availability logic ourselves (freebusy endpoint + working hours config)
- **WhatsApp** via `wa.me` deep links (no API needed, opens WhatsApp with pre-filled message)

---

## New Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `/book/<slug>` | Public (view), Google sign-in (book) | Client booking page |
| `/my-appointments` | Google sign-in (client) | Client self-service portal |
| `/onboarding` | Therapist auth | First-time setup wizard |
| `/api/google/callback` | — | OAuth callback handler |
| `/api/calendar/sync` | Therapist auth | Trigger calendar sync |
| `/api/calendar/availability` | Public | Fetch available slots for booking |

## New Database Tables

| Table | Purpose |
|-------|---------|
| `therapist_settings` | Working hours, break time, advance notice, cancellation window, GCal ID, booking slug |
| `google_tokens` | Encrypted OAuth refresh tokens per therapist |
| `bookings` | Client-initiated bookings (links to sessions table) |
| `client_accounts` | Client Google sign-in records (email, name, phone, linked client_id) |
