# therapybooks — Frontend Shell Design

**Date**: 2026-03-04
**Status**: Approved
**Scope**: Frontend shell with all page routes, Notion-like visual system, no database wiring

## Overview

Build the complete frontend shell for therapybooks — a therapy practice accounting app. All pages as empty-state shells with Notion-like visual design. Database integration comes later.

## Key Decisions

- **App name**: therapybooks
- **Multi-therapist**: Simple roster only (a Therapists page). No formal client-therapist linking yet.
- **Layout**: Notion-style white sidebar (same bg as content, thin 1px separator)
- **Phase 1 scope**: Frontend shell only — all routes with empty states, no Supabase schema
- **Old code cleanup**: Remove Contractors, Incentives, "PK Studio Finance" branding, collapsible sidebar logic

## Visual System

### Principles

- White background everywhere (sidebar and content same `#ffffff`)
- Minimal borders — 1px `#e5e5e5` only where needed
- No shadows, no rounded cards, no colored section backgrounds
- Flat everything; elevation only on modals/dropdowns
- Generous whitespace, content breathes
- Color accents only for balance indicators (green=credit, red=owes)

### Tokens

| Element | Value |
|---------|-------|
| Background | `#ffffff` |
| Sidebar separator | `1px solid #e5e5e5` (border-r) |
| Font | Inter via `next/font/google` |
| Nav item default | `text-sm text-neutral-500` |
| Nav item hover | `bg-neutral-100 text-neutral-900` |
| Nav item active | `bg-neutral-100 text-neutral-900 font-medium` |
| Page title | `text-2xl font-semibold text-neutral-900` |
| Body text | `text-sm text-neutral-600` |
| Muted text | `text-sm text-neutral-400` |
| Icons | Phosphor, 16px, `text-neutral-400` (active: `text-neutral-600`) |
| Table rows | No outer border, thin row separators, hover `bg-neutral-50` |
| Primary button | `bg-neutral-900 text-white` |
| Secondary button | `border border-neutral-200 text-neutral-700` |

## Layout Structure

```
+------------------+-----------------------------------+
| therapybooks     |                                   |
|                  |   Page Title                      |
| Dashboard        |   subtitle / count                |
| Clients          |                                   |
| Sessions         |   Content area                    |
| Transactions     |   (generous padding, max-w-4xl    |
| Invoices         |    or full width for tables)       |
| Therapists       |                                   |
|                  |                                   |
| [spacer]         |                                   |
|                  |                                   |
| Settings         |                                   |
+------------------+-----------------------------------+
```

- Sidebar: ~220px fixed, white bg, `border-r border-neutral-200`
- Content: fills remaining width, `p-8` or `p-10`
- Mobile: sidebar hidden, hamburger menu in a top bar

## Navigation

| Label | Route | Icon (Phosphor) |
|-------|-------|-----------------|
| Dashboard | `/` | SquaresFour |
| Clients | `/clients` | Users |
| Sessions | `/sessions` | CalendarBlank |
| Transactions | `/transactions` | ArrowsLeftRight |
| Invoices | `/invoices` | FileText |
| Therapists | `/therapists` | UserCheck |
| Settings | `/settings` | GearSix |

Settings is pinned to the bottom of the sidebar, separated by a spacer.

## Pages

| Route | Title | Empty State Message | Primary Action |
|-------|-------|-------------------|----------------|
| `/` | Dashboard | Summary cards showing zeros/dashes | — |
| `/clients` | Clients | "No clients yet. Add your first client to start tracking sessions and balances." | + New Client |
| `/clients/[id]` | [Client Name] | Balance breakdown, session history, payment history (all empty) | — |
| `/sessions` | Sessions | "No sessions recorded yet." | + Add Session |
| `/transactions` | Transactions | "No transactions imported yet. Import a bank statement to get started." | Import Statement |
| `/invoices` | Invoices | "No invoices created yet." | + New Invoice |
| `/therapists` | Therapists | "No therapists added yet." | + Add Therapist |
| `/settings` | Settings | Basic settings shell (placeholder) | — |
| `/login` | — | Email/password login form (centered, minimal) | — |

## File Structure

```
src/app/
  layout.tsx              # Root: Inter font, providers, html/body
  globals.css             # Notion-like CSS reset + variables
  (dashboard)/
    layout.tsx            # Sidebar + main content wrapper (auth-protected)
    page.tsx              # Dashboard
    clients/
      page.tsx            # Client list
      [id]/page.tsx       # Client detail
    sessions/page.tsx
    transactions/page.tsx
    invoices/page.tsx
    therapists/page.tsx
    settings/page.tsx
  login/page.tsx          # Public login page (no sidebar)
src/components/
  layout/
    sidebar.tsx           # Rewritten: Notion-style white sidebar
  ui/                     # Existing shadcn components (kept as-is)
```

## What Gets Deleted

- `src/components/layout/dashboard-shell.tsx` — replaced by `(dashboard)/layout.tsx`
- `src/components/layout/top-bar.tsx` — not needed
- Old sidebar code in `sidebar.tsx` — fully rewritten
- References to "PK Studio Finance", Contractors, Incentives

## What Gets Kept

- All shadcn UI components in `src/components/ui/`
- `src/components/transactions/import-statement-dialog.tsx` (will need action imports fixed later)
- `src/lib/` utilities (format, fiscal, date-range, supabase client/server)
- `src/middleware.ts` (auth redirect logic)
- `package.json` dependencies
