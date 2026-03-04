# Therapy Practice Accounting App

A standalone financial tracking app for a therapy practice, built on the same stack as Money Matters (Next.js + Supabase + Tailwind/shadcn). Reuses the HDFC bank statement parser. Deployed separately (own repo, own Supabase project, own Vercel deployment).

## Core Problem

Therapist needs to track **who owes what**. Clients pay in different patterns:
- Some prepay a lump sum (e.g. ₹50,000) that gets drawn down session by session
- Others pay per session
- Session rates are per-client and change over time

Secondary goal: basic session management with Google Calendar integration.

## Design: Credit Balance Model

Each client has a **running balance** (computed, not stored):

```
balance = sum(payments allocated to client) - sum(confirmed session rates)
```

- **Positive balance** = client has credit (prepaid)
- **Negative balance** = client owes money
- **Zero** = settled

This is analogous to the `invoice_payments` junction table in Money Matters — a single bank transaction can be split across multiple clients/sessions.

## Tax Situation

- No GST (below threshold / exempt)
- No TDS
- No multi-currency — INR only
- Invoices generated occasionally for corporate/insurance clients (simple format)

---

## Data Model

### `clients`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | text | required |
| phone | text | |
| email | text | |
| current_rate | numeric | current per-session fee (e.g. 1500) |
| notes | text | e.g. "corporate — needs invoices" |
| is_active | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `sessions`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| client_id | FK → clients | required |
| date | date | session date |
| start_time | time | |
| end_time | time | |
| duration_minutes | integer | |
| rate | numeric | rate snapshot at time of session |
| status | enum | `scheduled`, `confirmed`, `cancelled`, `no_show` |
| is_chargeable | boolean | default true for confirmed; configurable for no_show |
| source | text | `calendar_import` or `manual` |
| google_event_id | text | for dedup on calendar import |
| notes | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Only sessions where `status = 'confirmed'` (or `status = 'no_show' AND is_chargeable = true`) deduct from client balance.

### `transactions`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| date | date | |
| narration | text | from bank statement |
| amount | numeric | positive = credit, negative = debit |
| balance | numeric | closing balance from statement |
| reference | text | cheque/ref number |
| category | text | e.g. "Client Payment", "Rent", "Software" |
| is_personal | boolean | exclude from business reporting |
| source | text | `bank_statement` or `manual` |
| bank_file | text | source file name |
| data_issues | text | parsing issues |
| created_at | timestamptz | |

### `client_payments` (junction: transaction → client)
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| transaction_id | FK → transactions | |
| client_id | FK → clients | |
| amount | numeric | portion of transaction allocated to this client |
| created_at | timestamptz | |

This is the "wallet top-up". A single ₹1,00,000 bank transaction could be split:
- ₹50,000 → Client A
- ₹50,000 → Client B

### `session_payments` (junction: transaction → session)
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| transaction_id | FK → transactions | |
| session_id | FK → sessions | |
| amount | numeric | portion allocated to this session |
| created_at | timestamptz | |

Optional granularity — for when she wants to link specific payments to specific sessions. Most of the time `client_payments` is sufficient.

### `invoices` (lightweight)
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| invoice_number | integer | sequential |
| client_id | FK → clients | |
| date | date | invoice date |
| amount | numeric | total |
| description | text | e.g. "10 sessions (Jan–Feb 2026)" |
| status | enum | `draft`, `sent`, `paid` |
| pdf_path | text | stored PDF |
| created_at | timestamptz | |

### Balance Computation (view or query)

```sql
-- Per-client balance
SELECT
  c.id,
  c.name,
  COALESCE(payments.total, 0) AS total_paid,
  COALESCE(charges.total, 0) AS total_charged,
  COALESCE(payments.total, 0) - COALESCE(charges.total, 0) AS balance
FROM clients c
LEFT JOIN (
  SELECT client_id, SUM(amount) AS total
  FROM client_payments
  GROUP BY client_id
) payments ON payments.client_id = c.id
LEFT JOIN (
  SELECT client_id, SUM(rate) AS total
  FROM sessions
  WHERE (status = 'confirmed')
     OR (status = 'no_show' AND is_chargeable = true)
  GROUP BY client_id
) charges ON charges.client_id = c.id;
```

---

## Pages & Features

### 1. Dashboard (`/`)
- **Upcoming sessions** this week (from `scheduled` sessions)
  - Show client name, time, and their current balance
  - ⚠️ Highlight clients with low/negative balance
- **Clients needing attention** — negative balances, no upcoming sessions
- **Recent payments** — last few bank credits allocated
- **Monthly income summary** — total confirmed sessions × rates this month

### 2. Clients (`/clients`, `/clients/[id]`)
- **List view**: name, current rate, balance (color-coded: green=credit, red=owes)
- **Detail view**:
  - Balance breakdown: total paid vs total charged
  - Session history (date, status, rate)
  - Payment history (date, amount, transaction narration)
  - Rate — editable (only affects future sessions, old sessions keep their snapshot)
  - Quick actions: add manual payment, schedule session
- **New client form**: name, phone, email, rate

### 3. Sessions (`/sessions`)
- **List/calendar view** of sessions across all clients
- **Google Calendar import**:
  - OAuth connection to Google Calendar
  - Select which calendar to sync
  - Import creates `scheduled` sessions
  - Match calendar events to clients by event title / attendee email
  - Dedup by `google_event_id`
- **Session management**:
  - Bulk confirm: "Confirm all sessions from last week"
  - Individual: confirm / cancel / mark no-show
  - Manual entry: pick client, date, time
- **Filters**: by client, by status, by date range

### 4. Transactions (`/transactions`)
- **HDFC bank statement import** (reuse parser from Money Matters)
  - Same XLS format, same column detection
  - Duplicate detection by date|amount|narration
- **Auto-suggest**:
  - Match credit narrations to client names
  - Suggest allocation based on client's outstanding balance
- **Allocate payments**:
  - Select transaction → allocate to one or more clients
  - Split a single transaction across multiple clients
  - Auto-allocate: spread payment across client's unlinked sessions (oldest first)
- **Categories**: Client Payment, Rent, Utilities, Software, Personal, etc.
- **Filters**: by category, by type (income/expense), by date

### 5. Invoices (`/invoices`) — lightweight
- Generate simple invoice for corporate/insurance clients
- Select client → select sessions to include (or manual amount)
- Simple PDF: therapist name, client name, sessions list, total
- No GST/TDS fields
- Status: draft → sent → paid

---

## Google Calendar Integration

### OAuth Flow
1. Therapist connects Google account (OAuth 2.0, `calendar.readonly` scope)
2. Selects which calendar contains therapy sessions
3. Store refresh token in Supabase (encrypted)

### Sync Logic
1. Fetch events from selected calendar for a date range
2. Match events to clients:
   - By attendee email (if client has email on file)
   - By event title containing client name
   - Unmatched events shown for manual assignment
3. Create `scheduled` sessions with `google_event_id` for dedup
4. Periodic re-sync (manual trigger or daily cron)

### Event → Session Mapping
- Event title / description → session notes
- Event start/end → start_time, end_time, duration
- Event date → session date
- Attendee email → client lookup

---

## What We Reuse from Money Matters

| Component | Reuse? | Notes |
|-----------|--------|-------|
| HDFC bank parser | ✅ Yes | Same XLS format, same column detection |
| Transaction import dialog | ✅ Yes | Adapt suggestions to match clients instead of invoices |
| Auto-tag suggestions | ✅ Adapt | Match narrations to client names instead of contractor/invoice |
| Supabase auth | ✅ Yes | Email/password login |
| shadcn/ui components | ✅ Yes | Same UI library |
| Dashboard charts (Recharts) | ✅ Yes | Adapt for session/income data |
| Date range filters | ✅ Yes | Same fiscal year logic |
| Currency formatting | ✅ Simplify | INR only, remove USD logic |
| Invoice PDF generation | ✅ Simplify | Remove GST/TDS fields |
| GST/TDS logic | ❌ Remove | Not needed |
| Contractor module | ❌ Remove | Not applicable |
| Incentives module | ❌ Remove | Not applicable |
| Multi-currency support | ❌ Remove | INR only |
| invoice_payments junction | ✅ Pattern | Same pattern → `client_payments` and `session_payments` |

---

## Implementation Phases

### Phase 1: Foundation
- New Next.js project (same stack: App Router + TypeScript + Tailwind + shadcn)
- New Supabase project with schema (clients, sessions, transactions, client_payments)
- Auth setup (email/password)
- Basic layout (sidebar, navigation)

### Phase 2: Clients & Sessions
- Client CRUD (list, detail, create, edit)
- Manual session entry
- Session status management (confirm, cancel, no-show)
- Balance computation and display

### Phase 3: Bank Integration
- HDFC statement import (port parser)
- Transaction list with filters
- Payment allocation to clients
- Auto-suggest client matches

### Phase 4: Google Calendar
- OAuth integration
- Calendar event import
- Client matching (by email / name)
- Scheduled → confirmed workflow

### Phase 5: Dashboard & Invoices
- Dashboard with upcoming sessions, balances, income
- Lightweight invoice generation for corporate clients
- PDF export

### Phase 6: Polish
- Mobile responsiveness
- Notifications (low balance alerts)
- Data export (for CA / tax filing)
