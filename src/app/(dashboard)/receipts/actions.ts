"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateReceiptForPayment } from "@/app/(dashboard)/clients/generate-receipt";

/**
 * Backfill receipts for all existing client_payments that don't have one yet.
 */
export async function backfillReceipts(): Promise<{
  created: number;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { created: 0, error: "Not authenticated" };

  // Get all client_payments for this user
  const { data: payments } = await supabase
    .from("client_payments")
    .select("id, transaction_id, client_id, amount")
    .eq("user_id", user.id);

  if (!payments || payments.length === 0) return { created: 0 };

  // Get existing receipts to find which transaction+client combos already have one
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingReceipts } = await (supabase as any)
    .from("receipts")
    .select("transaction_id, client_id")
    .eq("user_id", user.id);

  const existingSet = new Set(
    (existingReceipts ?? []).map(
      (r: { transaction_id: number; client_id: number }) =>
        `${r.transaction_id}:${r.client_id}`
    )
  );

  let created = 0;
  for (const payment of payments) {
    const key = `${payment.transaction_id}:${payment.client_id}`;
    if (existingSet.has(key)) continue;

    const result = await generateReceiptForPayment(
      payment.client_id,
      payment.transaction_id,
      payment.amount,
      user.id
    );
    if (result.created) {
      created++;
      existingSet.add(key); // prevent duplicates within this run
    }
  }

  revalidatePath("/receipts");
  return { created };
}

export async function voidReceipt(
  receiptId: number
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("receipts")
    .update({ status: "void" })
    .eq("id", receiptId)
    .eq("user_id", user.id);

  if (error) return { error: "Failed to void receipt" };
  revalidatePath("/receipts");
  return {};
}
