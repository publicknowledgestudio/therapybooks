"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateReceipts } from "./generate-receipt";

/**
 * Idempotent FIFO allocator: deletes all session_payments for a client,
 * then re-allocates opening_balance + client_payments across chargeable
 * sessions (oldest first). Leftover funds become client credit.
 */
export async function allocateSessionPayments(
  clientId: number
): Promise<{ allocated: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { allocated: 0, error: "Not authenticated" };

  // Fetch client for opening_balance
  const { data: client } = await supabase
    .from("clients")
    .select("id, opening_balance")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();

  if (!client) return { allocated: 0, error: "Client not found" };

  // Chargeable sessions, oldest first
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, date, rate, status")
    .eq("client_id", clientId)
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("date", { ascending: true })
    .order("id", { ascending: true });

  // Client payments with transaction_ids, oldest first
  const { data: payments } = await supabase
    .from("client_payments")
    .select("id, amount, transaction_id, created_at")
    .eq("client_id", clientId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // Clear existing allocations for this client's sessions
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

  // Build fund queue: opening credit (null txn) first, then payments in order
  const allocationQueue: Array<{
    remaining: number;
    transactionId: number | null;
  }> = [];

  const openingCredit = Math.max(0, -client.opening_balance);
  if (openingCredit > 0) {
    allocationQueue.push({ remaining: openingCredit, transactionId: null });
  }
  for (const p of payments ?? []) {
    allocationQueue.push({
      remaining: p.amount,
      transactionId: p.transaction_id,
    });
  }

  // Positive opening_balance means client owes from before — drain that from funds
  let debtToSkip = Math.max(0, client.opening_balance);
  for (const fund of allocationQueue) {
    if (debtToSkip <= 0) break;
    const drain = Math.min(fund.remaining, debtToSkip);
    fund.remaining -= drain;
    debtToSkip -= drain;
  }

  const totalRemaining = allocationQueue.reduce((s, f) => s + f.remaining, 0);
  if (totalRemaining <= 0) {
    revalidatePath(`/clients/${clientId}`);
    return { allocated: 0 };
  }

  // FIFO: walk sessions oldest-first, allocate from fund queue
  const toInsert: Array<{
    user_id: string;
    session_id: number;
    transaction_id: number | null;
    amount: number;
  }> = [];

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
  }

  // Bulk insert allocations
  if (toInsert.length > 0) {
    const { error } = await supabase.from("session_payments").insert(toInsert);
    if (error) {
      console.error("Session payment allocation error:", error);
      return { allocated: 0, error: "Failed to allocate session payments" };
    }
  }

  // Auto-generate receipts for newly allocated sessions
  await generateReceipts(clientId, user.id);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/receipts");
  return { allocated: toInsert.length };
}
