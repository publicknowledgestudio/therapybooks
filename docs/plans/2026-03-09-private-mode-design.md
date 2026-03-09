# Private Mode (Hide Private Info)

**Date:** 2026-03-09
**Purpose:** Let the therapist hide client PII and financial data during screen-sharing sessions with their developer.

## Masking Rule

`mask(value)` → always 3 asterisks + last 2 characters of the raw string.

| Input | Output |
|---|---|
| `Priya Sharma` | `***ma` |
| `priya@email.com` | `***om` |
| `9876543210` | `***10` |
| `₹12,500` | `***00` |
| `AB` | `***` |

Values ≤2 characters → just `***`.

## What Gets Masked

- Client names (everywhere)
- Phone numbers
- Email addresses
- All money amounts (stat cards, per-session rates, balances, invoices)

## What Stays Visible

- Counts (session count, client count)
- Dates and times
- Status badges (scheduled, confirmed, etc.)
- Navigation, page titles, labels

## Architecture

1. **`PrivacyProvider`** — React Context wrapping the dashboard layout. Holds `isPrivate` boolean, defaults `false`. No persistence (resets on refresh).
2. **`usePrivacy()` hook** — returns `{ isPrivate, togglePrivacy, mask }`. When `isPrivate` is false, `mask()` is a passthrough.
3. **`mask(value)` utility** — pure function: `(value: string | number) => string`. Converts to string, returns `***` + last 2 chars.
4. **Sidebar toggle** — button above Settings, styled like nav items. `EyeSlash` icon + "Hide Private Info" label. When active: `Eye` icon + "Show Private Info".
5. **Component updates** — each client component that renders sensitive data calls `mask()` around the value.

## Files

| File | Purpose |
|---|---|
| `src/lib/privacy.tsx` | PrivacyProvider context, usePrivacy hook, mask utility |
| `src/components/layout/sidebar.tsx` | Add toggle button |
| `src/app/(dashboard)/layout.tsx` | Wrap children with PrivacyProvider |
| `src/components/dashboard/stat-cards.tsx` | Mask money values |
| `src/components/dashboard/appointments-today.tsx` | Mask client names, phones |
| `src/app/(dashboard)/clients/page.tsx` | Mask when client list is rendered |
| `src/app/(dashboard)/sessions/page.tsx` | Mask when session list is rendered |
