"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
