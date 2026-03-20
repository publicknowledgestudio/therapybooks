# Payment Receipts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-generate payment receipts when payments are allocated to sessions, with a public receipt page, print CSS, and WhatsApp sharing.

**Architecture:** Migration renames `invoices` → `receipts`, adds `receipt_sessions` join table, and adds profile fields to `therapist_settings`. Receipt generation hooks into the existing `allocateSessionPayments()` function. Public `/receipt/[id]` page with print styles. List page at `/receipts`.

**Tech Stack:** Next.js App Router, Supabase, existing FIFO allocator, print CSS (`@media print`)

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/009_receipts.sql`
- Modify: `src/lib/database.types.ts` (regenerate after migration)

**Step 1: Write the migration**

```sql
-- Rename invoices table to receipts
alter table public.invoices rename to receipts;

-- Rename invoice_status enum type
alter type public.invoice_status rename to receipt_status;

-- Drop unused columns
alter table public.receipts drop column if exists description;
alter table public.receipts drop column if exists pdf_path;

-- Rename invoice_number to receipt_number
alter table public.receipts rename column invoice_number to receipt_number;

-- Replace status enum: drop old values, add new ones
-- Since we can't easily modify enums, reset the default and column
alter table public.receipts alter column status drop default;
alter table public.receipts alter column status type text using status::text;
drop type public.receipt_status;
create type public.receipt_status as enum ('generated', 'void');
alter table public.receipts alter column status type public.receipt_status using 'generated'::public.receipt_status;
alter table public.receipts alter column status set default 'generated';

-- Add new columns
alter table public.receipts add column payment_method text default 'bank';
alter table public.receipts add column transaction_id integer references public.transactions(id);

-- Update RLS policy name
alter policy "Users can manage own invoices" on public.receipts rename to "Users can manage own receipts";

-- Receipt-sessions join table
create table public.receipt_sessions (
  id serial primary key,
  receipt_id integer references public.receipts(id) on delete cascade not null,
  session_id integer references public.sessions(id) not null,
  amount numeric not null
);

alter table public.receipt_sessions enable row level security;
-- Use a join-based policy: allow if the parent receipt belongs to the user
create policy "Users can manage own receipt_sessions" on public.receipt_sessions
  for all using (
    exists (select 1 from public.receipts where id = receipt_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.receipts where id = receipt_id and user_id = auth.uid())
  );

-- Add profile fields to therapist_settings
alter table public.therapist_settings add column if not exists pan_number text;
alter table public.therapist_settings add column if not exists registration_number text;
alter table public.therapist_settings add column if not exists clinic_address text;
```

**Step 2: Apply migration to remote Supabase**

Run the SQL in the Supabase dashboard SQL editor.

**Step 3: Regenerate database types**

Run: `npx supabase gen types typescript --project-id <project-id> > src/lib/database.types.ts`

**Step 4: Commit**

```bash
git add supabase/migrations/009_receipts.sql src/lib/database.types.ts
git commit -m "feat: add receipts migration (rename invoices, add receipt_sessions)"
```

---

### Task 2: Receipt generation logic

**Files:**
- Create: `src/app/(dashboard)/clients/generate-receipt.ts`
- Modify: `src/app/(dashboard)/clients/allocate-payments.ts` (call receipt generation after allocation)

**Step 1: Create the receipt generator**

Create `src/app/(dashboard)/clients/generate-receipt.ts`:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * After FIFO allocation, generate a receipt for any newly-paid sessions
 * that don't already have a receipt. Groups all session_payments by
 * transaction_id into one receipt per payment.
 */
export async function generateReceipts(
  clientId: number,
  userId: string
): Promise<{ created: number; error?: string }> {
  const supabase = await createClient();

  // Get all session_payments for this client's sessions
  const { data: sessionPayments } = await supabase
    .from("session_payments")
    .select("id, session_id, transaction_id, amount, sessions!inner(client_id)")
    .eq("user_id", userId)
    .eq("sessions.client_id", clientId);

  if (!sessionPayments || sessionPayments.length === 0) {
    return { created: 0 };
  }

  // Get existing receipt_sessions to avoid duplicates
  const { data: existingReceiptSessions } = await supabase
    .from("receipt_sessions")
    .select("session_id, receipt_id, receipts!inner(client_id)")
    .eq("receipts.client_id", clientId);

  const alreadyCovered = new Set(
    (existingReceiptSessions ?? []).map((rs) => rs.session_id)
  );

  // Filter to only new session_payments
  const newPayments = sessionPayments.filter(
    (sp) => !alreadyCovered.has(sp.session_id)
  );

  if (newPayments.length === 0) return { created: 0 };

  // Group by transaction_id (one receipt per payment source)
  const groups = new Map<number | null, typeof newPayments>();
  for (const sp of newPayments) {
    const key = sp.transaction_id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(sp);
  }

  // Get the next receipt number for this user
  const { data: maxReceipt } = await supabase
    .from("receipts")
    .select("receipt_number")
    .eq("user_id", userId)
    .order("receipt_number", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = (maxReceipt?.receipt_number ?? 0) + 1;
  let created = 0;

  // Determine payment method per transaction
  const transactionIds = [...groups.keys()].filter((id): id is number => id !== null);
  const { data: transactions } = transactionIds.length > 0
    ? await supabase
        .from("transactions")
        .select("id, date, type")
        .in("id", transactionIds)
    : { data: [] };

  const txnMap = new Map((transactions ?? []).map((t) => [t.id, t]));

  for (const [transactionId, payments] of groups) {
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const txn = transactionId ? txnMap.get(transactionId) : null;
    const paymentMethod = txn?.type === "cash" ? "cash" : "bank";
    const receiptDate = txn?.date ?? new Date().toISOString().split("T")[0];

    // Create receipt
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert({
        user_id: userId,
        receipt_number: nextNumber,
        client_id: clientId,
        date: receiptDate,
        amount: totalAmount,
        status: "generated" as const,
        payment_method: paymentMethod,
        transaction_id: transactionId,
      })
      .select("id")
      .single();

    if (receiptError || !receipt) {
      console.error("Failed to create receipt:", receiptError);
      continue;
    }

    // Create receipt_sessions
    const receiptSessionRows = payments.map((p) => ({
      receipt_id: receipt.id,
      session_id: p.session_id,
      amount: p.amount,
    }));

    const { error: rsError } = await supabase
      .from("receipt_sessions")
      .insert(receiptSessionRows);

    if (rsError) {
      console.error("Failed to create receipt_sessions:", rsError);
      continue;
    }

    nextNumber++;
    created++;
  }

  return { created };
}
```

**Step 2: Hook into allocateSessionPayments**

In `src/app/(dashboard)/clients/allocate-payments.ts`, add the receipt generation call at the end, just before the final `revalidatePath`:

```typescript
// After the bulk insert of session_payments (line ~141), add:
import { generateReceipts } from "./generate-receipt";

// At the end, before revalidatePath:
await generateReceipts(clientId, user.id);
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/clients/generate-receipt.ts src/app/(dashboard)/clients/allocate-payments.ts
git commit -m "feat: auto-generate receipts after FIFO allocation"
```

---

### Task 3: Settings page — add professional details fields

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx` (pass new props)
- Modify: `src/app/(dashboard)/settings/practice-profile-form.tsx` (add PAN, registration number, clinic address fields)

**Step 1: Add fields to PracticeProfileForm**

Add three new fields to the form schema and UI:
- `pan_number` (text input, placeholder "e.g. ABCDE1234F")
- `registration_number` (text input, placeholder "e.g. RCI/2024/12345")
- `clinic_address` (text input, placeholder "e.g. 204 Wellness Centre, Bandra West, Mumbai")

Add these to the existing zod schema as optional strings. Pass them as props from the settings page.

**Step 2: Pass new props from settings page**

In `settings/page.tsx`, pass `panNumber`, `registrationNumber`, `clinicAddress` from `settings` to the form.

**Step 3: Commit**

```bash
git add src/app/(dashboard)/settings/practice-profile-form.tsx src/app/(dashboard)/settings/page.tsx
git commit -m "feat: add PAN, registration number, clinic address to settings"
```

---

### Task 4: Sidebar navigation update

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Move receipts to main nav**

In `sidebar.tsx`:
- Add `Receipt` to the icon imports
- Add `{ label: "Payment Receipts", href: "/receipts", icon: Receipt }` to `NAV_ITEMS` after "Bank Statement"
- Remove "Invoices" from `COMING_SOON_ITEMS`

**Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Payment Receipts to main sidebar nav"
```

---

### Task 5: Receipts list page

**Files:**
- Create: `src/app/(dashboard)/receipts/page.tsx` (replaces invoices page)
- Create: `src/app/(dashboard)/receipts/loading.tsx` (skeleton)
- Delete: `src/app/(dashboard)/invoices/page.tsx`

**Step 1: Build the receipts list page**

Server component that queries `receipts` with joined `clients(name, phone)`. Displays:

- Page header: "Payment Receipts" with subtitle
- Table: # (formatted as #001), Client, Date, Amount, Actions
- Actions column: Copy Link button, Send via WhatsApp button (opens wa.me link), Void button
- Empty state when no receipts exist
- Filter by client (optional, dropdown)

Table uses existing `Table`, `TableHeader`, `TableRow`, `TableCell` components.

Receipt number formatting: `#${String(receipt_number).padStart(3, "0")}`.

Copy Link copies `${origin}/receipt/${receipt.id}` to clipboard with toast "Link copied."

WhatsApp button: `https://wa.me/${phone}?text=Hi ${name}, here's your payment receipt: ${url}` — only show if client has phone number.

**Step 2: Add loading skeleton**

Copy pattern from other `loading.tsx` files.

**Step 3: Commit**

```bash
git add src/app/(dashboard)/receipts/page.tsx src/app/(dashboard)/receipts/loading.tsx
git rm src/app/(dashboard)/invoices/page.tsx
git commit -m "feat: add receipts list page, remove invoices stub"
```

---

### Task 6: Public receipt page

**Files:**
- Create: `src/app/receipt/[id]/page.tsx` (public, outside dashboard layout)
- Create: `src/app/receipt/[id]/print-button.tsx` (client component for print)

**Step 1: Build the public receipt page**

Server component (no auth required) that:

1. Queries `receipts` by ID, joins:
   - `clients(name, email, phone)`
   - `receipt_sessions(session_id, amount, sessions(date, start_time, end_time, duration_minutes, rate))`
2. Queries `therapist_settings` by `user_id` from the receipt:
   - `practice_name, practice_address, practice_phone, pan_number, registration_number, clinic_address`
3. Also gets therapist name from `auth.users` via `user_metadata.full_name`

Layout (clean, minimal, no sidebar):

```
┌──────────────────────────────────────────┐
│  Practice Name                    PRINT  │
│  Clinic Address                          │
│  Phone | PAN | Reg No                    │
│──────────────────────────────────────────│
│  PAYMENT RECEIPT           #001          │
│  Date: 19 March 2026                     │
│                                          │
│  Received from: Client Name              │
│                                          │
│  ┌──────────┬──────────┬────────┐        │
│  │ Date     │ Duration │ Amount │        │
│  ├──────────┼──────────┼────────┤        │
│  │ 5 Mar    │ 50 min   │ ₹2,000│        │
│  │ 12 Mar   │ 50 min   │ ₹2,000│        │
│  ├──────────┼──────────┼────────┤        │
│  │ Total    │          │ ₹4,000│        │
│  └──────────┴──────────┴────────┘        │
│                                          │
│  Payment method: Bank Transfer           │
│                                          │
│  ──────────────────────────              │
│  Therapist Name                          │
└──────────────────────────────────────────┘
```

**Step 2: Print button (client component)**

Simple button that calls `window.print()`. Hidden in print CSS.

**Step 3: Print CSS**

Add `@media print` styles either inline or via a `<style>` tag in the page:
- Hide the print button
- Remove margins/padding
- Use `@page { margin: 1cm; }`
- Ensure text is black on white

**Step 4: Commit**

```bash
git add src/app/receipt/[id]/page.tsx src/app/receipt/[id]/print-button.tsx
git commit -m "feat: add public receipt page with print support"
```

---

### Task 7: Void receipt action

**Files:**
- Create: `src/app/(dashboard)/receipts/actions.ts`

**Step 1: Create server actions**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function voidReceipt(receiptId: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("receipts")
    .update({ status: "void" })
    .eq("id", receiptId)
    .eq("user_id", user.id);

  if (error) return { error: "Failed to void receipt" };

  revalidatePath("/receipts");
  return {};
}
```

**Step 2: Wire void button on receipts list page**

Add confirmation dialog before voiding. Voided receipts show with strikethrough styling and "VOID" badge.

**Step 3: Commit**

```bash
git add src/app/(dashboard)/receipts/actions.ts src/app/(dashboard)/receipts/page.tsx
git commit -m "feat: add void receipt action"
```

---

### Task 8: Middleware update for public receipt page

**Files:**
- Modify: `src/middleware.ts`

**Step 1: Allow public access to `/receipt/[id]`**

Add `/receipt` to the list of public paths that skip auth checks, alongside `/book`, `/my-appointments`, `/api`, etc.

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: allow public access to receipt pages"
```

---

### Task 9: Integration smoke test & cleanup

**Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

**Step 2: Manual smoke test**

1. Navigate to `/receipts` — should show empty state or existing receipts
2. Go to a client with allocated payments — receipts should have been auto-generated
3. Click a receipt row — should open public page in new tab
4. Click Print — browser print dialog should open with clean formatting
5. Copy Link — should copy URL to clipboard
6. Send via WhatsApp — should open wa.me link
7. Void a receipt — should show VOID badge

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: payment receipts feature complete"
```
