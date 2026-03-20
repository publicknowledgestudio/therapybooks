"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * After FIFO allocation, generate receipts for any newly-paid sessions
 * that don't already have a receipt. Groups session_payments by
 * transaction_id into one receipt per payment source.
 */
export async function generateReceipts(
  clientId: number,
  userId: string
): Promise<{ created: number; error?: string }> {
  const supabase = await createClient();

  // Get all session_payments for this client's sessions
  const { data: sessionPayments } = await (supabase as any)
    .from("session_payments")
    .select("id, session_id, transaction_id, amount")
    .eq("user_id", userId)
    .in(
      "session_id",
      (
        await supabase
          .from("sessions")
          .select("id")
          .eq("client_id", clientId)
          .eq("user_id", userId)
      ).data?.map((s: { id: number }) => s.id) ?? []
    );

  if (!sessionPayments || sessionPayments.length === 0) {
    return { created: 0 };
  }

  // Get existing receipt_sessions to avoid duplicates
  const { data: existingReceiptSessions } = await (supabase as any)
    .from("receipt_sessions")
    .select("session_id");

  // Filter to sessions already on a receipt for this client
  const existingSessionIds = new Set<number>();
  if (existingReceiptSessions) {
    for (const rs of existingReceiptSessions) {
      existingSessionIds.add(rs.session_id);
    }
  }

  // Filter to only new session_payments not already on a receipt
  const newPayments = sessionPayments.filter(
    (sp: { session_id: number }) => !existingSessionIds.has(sp.session_id)
  );

  if (newPayments.length === 0) return { created: 0 };

  // Group by transaction_id (one receipt per payment source)
  const groups = new Map<
    number | null,
    Array<{ session_id: number; transaction_id: number | null; amount: number }>
  >();
  for (const sp of newPayments) {
    const key = sp.transaction_id ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(sp);
  }

  // Get the next receipt number for this user
  const { data: maxReceipt } = await (supabase as any)
    .from("receipts")
    .select("receipt_number")
    .eq("user_id", userId)
    .order("receipt_number", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = ((maxReceipt as any)?.receipt_number ?? 0) + 1;
  let created = 0;

  // Determine payment method per transaction
  const transactionIds = [...groups.keys()].filter(
    (id): id is number => id !== null
  );
  const { data: transactions } =
    transactionIds.length > 0
      ? await supabase
          .from("transactions")
          .select("id, date, type")
          .in("id", transactionIds)
      : { data: [] };

  const txnMap = new Map(
    (transactions ?? []).map((t) => [t.id, t])
  );

  for (const [transactionId, payments] of groups) {
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const txn = transactionId ? txnMap.get(transactionId) : null;
    const paymentMethod =
      (txn as any)?.type === "cash" ? "cash" : "bank";
    const receiptDate =
      txn?.date ?? new Date().toISOString().split("T")[0];

    // Create receipt
    const { data: receipt, error: receiptError } = await (supabase as any)
      .from("receipts")
      .insert({
        user_id: userId,
        receipt_number: nextNumber,
        client_id: clientId,
        date: receiptDate,
        amount: totalAmount,
        status: "generated",
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
      receipt_id: (receipt as any).id,
      session_id: p.session_id,
      amount: p.amount,
    }));

    const { error: rsError } = await (supabase as any)
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
