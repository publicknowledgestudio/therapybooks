# Add Client Dialog

## Overview

A popup dialog triggered by the "New Client" button on the /clients page. Allows creating a client with Name, Email, Phone, and Session Rate. On success, closes the dialog, shows a toast, and refreshes the client list.

## Form Fields

| Field | Type | Required | DB Column |
|-------|------|----------|-----------|
| Name | text | Yes | `name` |
| Email | email | No | `email` |
| Phone | tel | No | `phone` |
| Session Rate (INR) | number | No | `current_rate` |

## Components

### `AddClientDialog` (`src/components/clients/add-client-dialog.tsx`)

- `"use client"` component using shadcn `<Dialog>`
- Renders the "New Client" button as `<DialogTrigger>`
- Form uses `useTransition` to call the server action
- On success: toast, close dialog (list refreshes via revalidation)
- On error: display error message inline

### Server Action: `createClient` (`src/app/(dashboard)/clients/actions.ts`)

- Validates name is non-empty
- Gets `user_id` from Supabase auth
- Inserts into `clients` table
- Calls `revalidatePath("/clients")`
- Returns `{ id }` or `{ error }`

## Wiring

The `clients/page.tsx` server component renders `<AddClientDialog />` in place of the current standalone `<Button>`. The dialog is a client component that handles its own open/close state.

## After Save

Close dialog, show success toast, client list auto-refreshes via `revalidatePath`.
