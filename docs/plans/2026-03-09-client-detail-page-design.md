# Client Detail / Edit Page

## Overview

A detail page at `/clients/[id]` showing the full client profile with inline-editable fields, balance summary cards, session history, and payment history. Follows the server-component-first pattern with a client component island for inline editing.

## Page Layout

### Header
- Back link (`← Clients`) navigating to `/clients`
- Client name as page title (rendered by the server component)

### Client Profile (Client Component: `ClientProfile`)

Inline-editable fields:

| Field | Type | DB Column | Validation |
|-------|------|-----------|------------|
| Name | text | `name` | Required, non-empty |
| Email | email | `email` | Optional |
| Phone | tel | `phone` | Optional |
| Session Rate (INR) | number | `current_rate` | Optional, ≥ 0 |
| Opening Balance (INR) | number | `opening_balance` | ≥ 0 |
| Notes | textarea | `notes` | Optional, freeform |

Each field displays as label + value. Clicking the value turns it into an input. Saves on blur or Enter, cancels on Escape. Shows a toast on success.

### Balance Summary Cards

A row of stat cards (server-rendered):

| Card | Calculation |
|------|-------------|
| Opening Balance | `opening_balance` |
| Sessions Charged | Sum of `rate` from non-cancelled sessions |
| Payments Received | Sum of `amount` from `client_payments` |
| Outstanding Balance | opening_balance + sessions_charged − payments_received |

### Session History Table (Server-rendered, read-only)

Columns: Date, Time, Duration, Rate, Status. Sorted newest first.

### Payment History Table (Server-rendered, read-only)

Columns: Date, Amount. Sorted newest first. Joined from `client_payments` → `transactions` for the date.

## Components

### `InlineField` (`src/components/ui/inline-field.tsx`)

Reusable inline editing component.

Props:
- `label: string`
- `value: string | number | null`
- `field: string` (DB column name)
- `clientId: number`
- `type: "text" | "email" | "tel" | "number" | "textarea"`
- `placeholder?: string`
- `format?: (v: any) => string` (display formatter, e.g. formatINR)
- `required?: boolean`

Behavior:
- Click value → show input pre-filled with current value
- Enter / blur → call `updateClientAction(clientId, field, newValue)`
- Escape → revert to original value, close input
- Loading spinner while saving
- Toast on success, revert + inline error on failure

### `ClientProfile` (`src/components/clients/client-profile.tsx`)

`"use client"` component that renders 6 `InlineField` instances. Receives the client record as a prop. Supports privacy masking in read mode.

### Server Action: `updateClientAction` (`src/app/(dashboard)/clients/actions.ts`)

```
updateClientAction(
  clientId: number,
  field: string,
  value: string
): Promise<{ success?: boolean; error?: string }>
```

- Validates `field` against an allowlist: `name`, `email`, `phone`, `current_rate`, `opening_balance`, `notes`
- Applies per-field validation (name non-empty, rate/balance ≥ 0)
- Updates single column in `clients` table
- Calls `revalidatePath("/clients/[id]")` and `revalidatePath("/clients")`
- Returns `{ success: true }` or `{ error: "message" }`

## Wiring

### Client List → Detail Page

Make `ClientList` table rows clickable by wrapping each `<TableRow>` content in a `<Link href={/clients/${client.id}}>`.

### Page Data Fetching

`clients/[id]/page.tsx` (server component):

1. Get authenticated user
2. Fetch client by id (+ verify `user_id` matches)
3. Fetch sessions for client (ordered by date desc)
4. Fetch client_payments joined with transactions for date (ordered by date desc)
5. Render `<ClientProfile>` with client data
6. Render balance cards, session table, payment table

## Empty States

- No sessions: "No sessions recorded yet."
- No payments: "No payments received yet."
- Client not found / wrong user: Redirect to `/clients`
