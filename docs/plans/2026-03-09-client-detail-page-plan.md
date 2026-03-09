# Client Detail Page — Implementation Plan

Design: `docs/plans/2026-03-09-client-detail-page-design.md`

## Batch 1: Server action + InlineField component

### Task 1.1 — Add `updateClientAction` to `clients/actions.ts`

Add a new exported server action to the existing file.

**Signature:**
```ts
export async function updateClientAction(
  clientId: number,
  field: string,
  value: string
): Promise<{ success?: boolean; error?: string }>
```

**Implementation:**
- Validate `field` against allowlist: `["name", "email", "phone", "current_rate", "opening_balance", "notes"]`
- Get authenticated user, verify ownership (`user_id` match on the client row)
- Per-field validation:
  - `name`: trim, reject if empty
  - `email`, `phone`, `notes`: trim, store empty as `null`
  - `current_rate`: parse float, reject if negative, store empty as `null`
  - `opening_balance`: parse float, reject if negative, default `0`
- Update single column: `.update({ [field]: parsedValue }).eq("id", clientId).eq("user_id", user.id)`
- `revalidatePath("/clients")` and `revalidatePath(\`/clients/${clientId}\`)`
- Return `{ success: true }` or `{ error }`

**File:** `src/app/(dashboard)/clients/actions.ts` (append to existing)

### Task 1.2 — Create `InlineField` component

A `"use client"` component for inline editing a single field.

**File:** `src/components/ui/inline-field.tsx`

**Props:**
```ts
interface InlineFieldProps {
  label: string;
  value: string | number | null;
  field: string;
  clientId: number;
  type?: "text" | "email" | "tel" | "number" | "textarea";
  placeholder?: string;
  format?: (v: string | number | null) => string;
  required?: boolean;
}
```

**Behavior:**
- **Read mode:** Renders `<div>` with label (small muted text) and value (normal text). Value shows formatted output or em-dash if empty. Entire div has `cursor-pointer` + subtle hover bg.
- **Edit mode (on click):** Swaps value to `<Input>` (or `<Textarea>` for notes) pre-filled with raw value. Auto-focuses.
- **Save (blur / Enter):** Calls `updateClientAction(clientId, field, newValue)` via `startTransition`. Shows `CircleNotch` spinner next to label while pending. On success: toast "Updated", exit edit mode, update local state. On error: revert to original value, show toast error.
- **Cancel (Escape):** Revert to original value, exit edit mode.
- Uses `usePrivacy()` mask in read mode.
- For `type="number"`, store the raw numeric string but display via `format` prop.

**Dependencies:** `Input`, `CircleNotch` from icons, `toast` from sonner, `usePrivacy`, `updateClientAction`

### Verify: `npx tsc --noEmit` passes

---

## Batch 2: ClientProfile component + Detail page

### Task 2.1 — Create `ClientProfile` component

**File:** `src/components/clients/client-profile.tsx`

A `"use client"` component that renders 6 `InlineField` instances in a grid.

**Props:**
```ts
interface ClientProfileProps {
  client: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    current_rate: number | null;
    opening_balance: number;
    notes: string | null;
  };
}
```

**Layout:** Two-column grid on `sm:` screens, single column on mobile.
- Row 1: Name (full width)
- Row 2: Email, Phone
- Row 3: Session Rate (formatted with `formatINR`), Opening Balance (formatted with `formatINR`)
- Row 4: Notes (full width, textarea type)

### Task 2.2 — Implement `clients/[id]/page.tsx` server component

Replace the placeholder with the full implementation.

**File:** `src/app/(dashboard)/clients/[id]/page.tsx`

**Data fetching (all via Supabase, authenticated):**
1. Fetch client: `.from("clients").select("*").eq("id", id).eq("user_id", user.id).single()`
   - If not found → `redirect("/clients")`
2. Fetch sessions: `.from("sessions").select("id, date, start_time, end_time, duration_minutes, rate, status").eq("client_id", id).order("date", { ascending: false })`
3. Fetch payments: `.from("client_payments").select("id, amount, created_at, transaction_id, transactions(date)").eq("client_id", id).order("created_at", { ascending: false })`

**Rendering:**
- **Header:** `<Link href="/clients">← Clients</Link>` + `<h1>{client.name}</h1>`
- **Client Profile:** `<ClientProfile client={client} />`
- **Balance cards:** 4 stat cards in a `grid sm:grid-cols-2 lg:grid-cols-4`:
  - Opening Balance: `formatINR(client.opening_balance)`
  - Sessions Charged: sum of rate from non-cancelled sessions
  - Payments Received: sum of payment amounts
  - Outstanding: opening_balance + charged − paid (color-coded red/green)
- **Session History:** `<Table>` with Date, Time, Duration, Rate, Status columns. Badge for status. Empty state: "No sessions recorded yet."
- **Payment History:** `<Table>` with Date, Amount columns. Use transaction date when available, fall back to `created_at`. Empty state: "No payments received yet."

**Imports:** `Link` from `next/link`, `redirect` from `next/navigation`, `createClient`, `formatINR`, `formatDate`, `Badge`, `Table` components, `ClientProfile`, `ArrowLeft` icon.

### Verify: `npx tsc --noEmit` passes

---

## Batch 3: Client list linking + final check

### Task 3.1 — Make client list rows clickable

**File:** `src/components/clients/client-list.tsx`

- Import `Link` from `next/link`
- Wrap each `<TableRow>` with click navigation. Use `useRouter` + `onClick` on the row (since wrapping `<tr>` in `<Link>` is invalid HTML). Add `className="cursor-pointer hover:bg-accent/50"` to the row.
- Alternatively: wrap each `<TableCell>` content in a `<Link>` — but simpler to use router push on row click.

**Approach:** Add `onClick={() => router.push(\`/clients/${client.id}\`)}` to each `<TableRow>`, add `useRouter` import, add cursor/hover styles.

### Task 3.2 — Add `ArrowLeft` to icons barrel export

**File:** `src/components/ui/icons.tsx`

Add `ArrowLeft` to the Phosphor icons export (needed for back navigation in the detail page header).

### Verify: `npx tsc --noEmit` passes, then manual smoke test via preview server.
