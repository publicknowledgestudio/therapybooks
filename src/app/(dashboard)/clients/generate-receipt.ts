"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Generate a receipt for a client payment. Called after a payment is linked
 * to a client (bank statement match or cash recording). Creates one receipt
 * per client_payment, with allocated sessions attached if they exist.
 *
 * If a receipt already exists for this transaction+client combo, skips it.
 */
export async function generateReceiptForPayment(
  clientId: number,
  transactionId: number,
  amount: number,
  userId: string
): Promise<{ created: boolean; error?: string }> {
  const supabase = await createClient();

  // Check if a receipt already exists for this transaction+client
  const { data: existing } = await (supabase as any)
    .from("receipts")
    .select("id")
    .eq("client_id", clientId)
    .eq("transaction_id", transactionId)
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (existing) return { created: false };

  // Get the next receipt number
  const { data: maxReceipt } = await (supabase as any)
    .from("receipts")
    .select("receipt_number")
    .eq("user_id", userId)
    .order("receipt_number", { ascending: false })
    .limit(1)
    .single();

  const nextNumber = ((maxReceipt as any)?.receipt_number ?? 0) + 1;

  // Get the transaction to determine date and payment method
  const { data: txn } = await supabase
    .from("transactions")
    .select("id, date, type")
    .eq("id", transactionId)
    .single();

  const paymentMethod = (txn as any)?.type === "cash" ? "cash" : "bank";
  const receiptDate = txn?.date ?? new Date().toISOString().split("T")[0];

  // Create the receipt
  const { data: receipt, error: receiptError } = await (supabase as any)
    .from("receipts")
    .insert({
      user_id: userId,
      receipt_number: nextNumber,
      client_id: clientId,
      date: receiptDate,
      amount,
      status: "generated",
      payment_method: paymentMethod,
      transaction_id: transactionId,
    })
    .select("id")
    .single();

  if (receiptError || !receipt) {
    console.error("Failed to create receipt:", receiptError);
    return { created: false, error: receiptError?.message };
  }

  // Attach allocated sessions if any exist for this transaction
  const { data: sessionPayments } = await (supabase as any)
    .from("session_payments")
    .select("session_id, amount")
    .eq("transaction_id", transactionId)
    .eq("user_id", userId);

  if (sessionPayments && sessionPayments.length > 0) {
    const receiptSessionRows = sessionPayments.map(
      (sp: { session_id: number; amount: number }) => ({
        receipt_id: (receipt as any).id,
        session_id: sp.session_id,
        amount: sp.amount,
      })
    );

    const { error: rsError } = await (supabase as any)
      .from("receipt_sessions")
      .insert(receiptSessionRows);

    if (rsError) {
      console.error("Failed to create receipt_sessions:", rsError);
    }
  }

  return { created: true };
}
