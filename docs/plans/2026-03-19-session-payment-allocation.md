# Session-Level Payment Allocation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up the existing `session_payments` table so payments are allocated to individual sessions via FIFO, and show per-session paid/unpaid status on the client detail page. Also support re-allocation when opening balance changes.

**Architecture:** A single idempotent `allocateSessionPayments(clientId)` server action deletes all existing session_payments for a client, then re-allocates funds (opening_balance + client_payments) across chargeable sessions oldest-first. This function is called after bank statement import, opening balance updates, and via a manual "Re-allocate" button. `session_payments.transaction_id` is made nullable to support sessions covered by opening balance (no linked transaction).

**Tech Stack:** Next.js 15, Supabase (Postgres + RLS), TypeScript, server actions

---

### Task 1: Migration — Make session_payments.transaction_id nullable

**Files:**
- Create: `supabase/migrations/006_nullable_session_payment_txn.sql`
- Modify: `src/lib/database.types.ts` (update generated types)

**Step 1: Write the migration**

```sql
-- 006_nullable_session_payment_txn.sql
-- Allow session_payments without a linked transaction (e.g. covered by opening balance)
alter table public.session_payments alter column transaction_id drop not null;
```

**Step 2: Update TypeScript types**

In `src/lib/database.types.ts`, find the `session_payments` section.

Change the `Row` type:
```typescript
transaction_id: number
```
to:
```typescript
transaction_id: number | null
```

Change the `Insert` type:
```typescript
transaction_id: number
```
to:
```typescript
transaction_id?: number | null
```

The `Update` type already has `transaction_id?: number` — change to `transaction_id?: number | null`.

**Step 3: Commit**

```bash
git add supabase/migrations/006_nullable_session_payment_txn.sql src/lib/database.types.ts
git commit -m "feat: make session_payments.transaction_id nullable for opening balance coverage"
```

---

### Task 2: Create the allocateSessionPayments server action

**Files:**
- Create: `src/app/(dashboard)/clients/allocate-payments.ts`

**Step 1: Write the allocation function**

Create `src/app/(dashboard)/clients/allocate-payments.ts`:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Idempotent FIFO allocator: deletes all session_payments for a client,
 * then re-allocates opening_balance + client_payments across chargeable
 * sessions (oldest first). Leftover funds = client credit.
 */
export async function allocateSessionPayments(
  clientId: number
): Promise<{ allocated: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { allocated: 0, error: "Not authenticated" };

  // 1. Fetch client (for opening_balance)
  const { data: client } = await supabase
    .from("clients")
    .select("id, opening_balance")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();

  if (!client) return { allocated: 0, error: "Client not found" };

  // 2. Fetch chargeable sessions, oldest first
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, date, rate, status")
    .eq("client_id", clientId)
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("date", { ascending: true })
    .order("id", { ascending: true });

  // 3. Fetch client_payments with their transaction_ids, oldest first
  const { data: payments } = await supabase
    .from("client_payments")
    .select("id, amount, transaction_id, created_at")
    .eq("client_id", clientId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // 4. Delete existing session_payments for this client's sessions
  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (sessionIds.length > 0) {
    await supabase
      .from("session_payments")
      .delete()
      .in("session_id", sessionIds)
      .eq("user_id", user.id);
  }

  if (!sessions || sessions.length === 0) {
    revalidatePath(`/clients/${clientId}`);
    return { allocated: 0 };
  }

  // 5. Build the fund pool: opening balance first, then payments in order
  //    Each fund has an amount remaining and an optional transaction_id
  const funds: Array<{ remaining: number; transactionId: number | null }> = [];

  // Opening balance as a positive "advance" fund (only if client paid in advance, i.e. negative opening_balance)
  // Positive opening_balance means client owes — not a fund.
  // Negative opening_balance means client paid in advance — that's a fund.
  // Zero opening_balance means nothing to contribute.
  //
  // Wait — the balance formula is: outstanding = opening_balance + sessions_charged - payments_received
  // So opening_balance > 0 means the client already owed money before the system.
  // opening_balance < 0 means the client had overpaid / had credit.
  //
  // For FIFO: we treat payments_received as funds. Opening balance credit (negative) is also a fund.
  // Opening balance debt (positive) means sessions need MORE payment, not less.
  //
  // Actually, re-thinking: the allocator should mirror the balance formula.
  // Total funds available = payments_received + max(0, -opening_balance)
  // Total to pay = sessions_charged + max(0, opening_balance)
  //
  // Simpler approach: just walk sessions and deduct from a running "funds" number.
  // funds_pool = payments_received - opening_balance
  // (If opening_balance is positive/owes, it reduces available funds.
  //  If opening_balance is negative/advance, it increases available funds.)

  let fundsRemaining = -client.opening_balance; // advance = positive funds, debt = negative

  // Add all payment amounts to the pool
  const paymentQueue = (payments ?? []).map((p) => ({
    remaining: p.amount,
    transactionId: p.transaction_id,
  }));

  for (const p of paymentQueue) {
    fundsRemaining += p.remaining;
  }

  if (fundsRemaining <= 0) {
    // No funds to allocate
    revalidatePath(`/clients/${clientId}`);
    return { allocated: 0 };
  }

  // 6. FIFO: walk sessions oldest-first, allocate from fund pool
  const toInsert: Array<{
    user_id: string;
    session_id: number;
    transaction_id: number | null;
    amount: number;
  }> = [];

  // We need to track which transaction paid for which session.
  // Rebuild a queue: opening_balance credit first (null txn), then payments in order.
  const allocationQueue: Array<{
    remaining: number;
    transactionId: number | null;
  }> = [];

  const openingCredit = Math.max(0, -client.opening_balance);
  if (openingCredit > 0) {
    allocationQueue.push({ remaining: openingCredit, transactionId: null });
  }
  for (const p of paymentQueue) {
    allocationQueue.push({ remaining: p.remaining, transactionId: p.transactionId });
  }

  // If opening_balance is positive (client owes), we need to "skip" that much from the front.
  let debtToSkip = Math.max(0, client.opening_balance);

  // Drain the debt from the allocation queue
  for (const fund of allocationQueue) {
    if (debtToSkip <= 0) break;
    const drain = Math.min(fund.remaining, debtToSkip);
    fund.remaining -= drain;
    debtToSkip -= drain;
  }

  let queueIdx = 0;

  for (const session of sessions) {
    const rate = session.rate ?? 0;
    if (rate <= 0) continue;

    let sessionRemaining = rate;

    while (sessionRemaining > 0 && queueIdx < allocationQueue.length) {
      const fund = allocationQueue[queueIdx];
      if (fund.remaining <= 0) {
        queueIdx++;
        continue;
      }

      const applied = Math.min(fund.remaining, sessionRemaining);
      toInsert.push({
        user_id: user.id,
        session_id: session.id,
        transaction_id: fund.transactionId,
        amount: applied,
      });

      fund.remaining -= applied;
      sessionRemaining -= applied;

      if (fund.remaining <= 0) queueIdx++;
    }

    // If sessionRemaining > 0, this session is partially or fully unpaid — that's fine.
  }

  // 7. Bulk insert
  if (toInsert.length > 0) {
    const { error } = await supabase.from("session_payments").insert(toInsert);
    if (error) {
      console.error("Session payment allocation error:", error);
      return { allocated: 0, error: "Failed to allocate session payments" };
    }
  }

  revalidatePath(`/clients/${clientId}`);
  return { allocated: toInsert.length };
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/clients/allocate-payments.ts
git commit -m "feat: add idempotent FIFO session payment allocator"
```

---

### Task 3: Call allocator after bank statement import

**Files:**
- Modify: `src/app/(dashboard)/statement/actions.ts:82-95`

**Step 1: Add the allocator call after client_payments insert**

In `src/app/(dashboard)/statement/actions.ts`, after the `client_payments` insert block (around line 91), add:

```typescript
// After the client_payments insert block, trigger session allocation for affected clients
import { allocateSessionPayments } from "@/app/(dashboard)/clients/allocate-payments";

// ... inside importTransactions, after client_payments insert succeeds:

// Re-allocate session payments for each affected client
const affectedClientIds = [...new Set(clientPayments.map((cp) => cp.client_id))];
await Promise.all(
  affectedClientIds.map((cid) => allocateSessionPayments(cid))
);
```

The import goes at the top of the file. The allocation call goes right after line 91 (after the client_payments insert `if` block), before `revalidatePath("/statement")`.

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/statement/actions.ts
git commit -m "feat: trigger session payment allocation after bank statement import"
```

---

### Task 4: Call allocator after opening balance update

**Files:**
- Modify: `src/app/(dashboard)/clients/actions.ts:115-126`

**Step 1: Add allocator call in the opening_balance case**

In `src/app/(dashboard)/clients/actions.ts`, in `updateClientAction`, after the successful `.update()` call (line 135), add a check:

```typescript
import { allocateSessionPayments } from "@/app/(dashboard)/clients/allocate-payments";

// After the successful update (after line 139, before revalidatePath):
if (field === "opening_balance") {
  await allocateSessionPayments(clientId);
}
```

The import goes at the top of the file. The allocation call goes between the error check and `revalidatePath`.

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/clients/actions.ts
git commit -m "feat: re-allocate session payments when opening balance changes"
```

---

### Task 5: Add "Payment" column to session history table

**Files:**
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

**Step 1: Fetch session_payments alongside sessions**

In the client detail page, update the sessions query (line 52) to join session_payments:

```typescript
supabase
  .from("sessions")
  .select("id, date, start_time, end_time, duration_minutes, rate, status, session_payments(id)")
  .eq("client_id", clientId)
  .eq("user_id", user.id)
  .order("date", { ascending: false }),
```

**Step 2: Add Payment column header**

After the Status `<TableHead>` (line 183), add:

```tsx
<TableHead>Payment</TableHead>
```

**Step 3: Add Payment badge cell**

After the Status `<TableCell>` block (after line 206), add:

```tsx
<TableCell>
  {session.status === "cancelled" ? null : (
    <Badge
      variant={
        (session.session_payments as { id: number }[])?.length > 0
          ? "default"
          : "outline"
      }
      className={
        (session.session_payments as { id: number }[])?.length > 0
          ? "bg-green-100 text-green-800 hover:bg-green-100"
          : "text-muted-foreground"
      }
    >
      {(session.session_payments as { id: number }[])?.length > 0
        ? "Paid"
        : "Unpaid"}
    </Badge>
  )}
</TableCell>
```

**Step 4: Verify types compile and visually check**

Run: `npx tsc --noEmit`
Then check the client detail page in browser — sessions should show "Unpaid" badges (no allocations yet).

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/clients/\[id\]/page.tsx
git commit -m "feat: show paid/unpaid badge on session history table"
```

---

### Task 6: Add "Re-allocate Payments" button

**Files:**
- Create: `src/components/clients/reallocate-button.tsx`
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

**Step 1: Create the client component**

Create `src/components/clients/reallocate-button.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ArrowsClockwise } from "@/components/ui/icons";
import { allocateSessionPayments } from "@/app/(dashboard)/clients/allocate-payments";
import { useRouter } from "next/navigation";

export function ReallocateButton({ clientId }: { clientId: number }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await allocateSessionPayments(clientId);
      if (result.error) {
        setMessage(`Error: ${result.error}`);
      } else {
        setMessage(`Allocated ${result.allocated} payment(s)`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
      >
        <ArrowsClockwise
          className={`mr-1.5 h-4 w-4 ${isPending ? "animate-spin" : ""}`}
        />
        {isPending ? "Allocating..." : "Re-allocate Payments"}
      </Button>
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
}
```

**Step 2: Check ArrowsClockwise icon exists**

Look in `src/components/ui/icons.tsx` for `ArrowsClockwise`. If it doesn't exist, use a different Phosphor icon that does exist (like `ArrowsLeftRight`) or add the import from `@phosphor-icons/react/dist/ssr`.

**Step 3: Add the button to the client detail page**

In `src/app/(dashboard)/clients/[id]/page.tsx`, import the component:

```typescript
import { ReallocateButton } from "@/components/clients/reallocate-button";
```

Then in the Payments section header (line 217), change:

```tsx
<h2 className="text-lg font-medium text-foreground">Payments</h2>
```

to:

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-lg font-medium text-foreground">Payments</h2>
  <ReallocateButton clientId={client.id} />
</div>
```

**Step 4: Verify types compile and test in browser**

Run: `npx tsc --noEmit`
Then click the button on a client page — it should call the allocator and refresh.

**Step 5: Commit**

```bash
git add src/components/clients/reallocate-button.tsx src/app/\(dashboard\)/clients/\[id\]/page.tsx
git commit -m "feat: add re-allocate payments button on client detail page"
```

---

### Task 7: Apply the migration to remote Supabase

**Step 1: Run the migration**

Apply `006_nullable_session_payment_txn.sql` to your Supabase instance. This depends on your deploy process — either:

```bash
supabase db push
```

or apply manually in the Supabase SQL editor:

```sql
alter table public.session_payments alter column transaction_id drop not null;
```

**Step 2: Verify by testing the full flow**

1. Go to a client detail page
2. Click "Re-allocate Payments"
3. Sessions with enough funds should show "Paid" badges
4. Import a new bank statement — affected client sessions should auto-update
5. Change a client's opening balance — sessions should re-allocate

---

### Task 8: End-to-end smoke test

**Step 1: Test with no payments**

Go to a client with sessions but no payments. All sessions should show "Unpaid". Re-allocate should show "Allocated 0 payment(s)".

**Step 2: Test with opening balance credit**

Set a client's opening balance to a negative value (e.g., -3000 for "Paid in advance"). Click Re-allocate. The oldest sessions up to 3000 INR should flip to "Paid".

**Step 3: Test with opening balance debt**

Set a client's opening balance to a positive value (e.g., 1000 for "Owes you"). This should consume 1000 worth of payment funds before any sessions get marked paid.

**Step 4: Test bank statement import**

Import a statement with a payment matched to a client. After import, check the client's sessions — allocation should have run automatically.

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: adjustments from end-to-end testing"
```
