"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createClientAction(formData: {
  name: string;
  email: string;
  phone: string;
  currentRate: string;
  openingBalance: string;
}): Promise<{ id?: number; error?: string }> {
  const name = formData.name.trim();
  if (!name) {
    return { error: "Client name is required" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const rateValue = formData.currentRate.trim();
  const currentRate = rateValue ? parseFloat(rateValue) : null;
  if (rateValue && (isNaN(currentRate!) || currentRate! < 0)) {
    return { error: "Session rate must be a valid positive number" };
  }

  const balanceValue = formData.openingBalance.trim();
  const openingBalance = balanceValue ? parseFloat(balanceValue) : 0;
  if (balanceValue && (isNaN(openingBalance) || openingBalance < 0)) {
    return { error: "Opening balance must be a valid positive number" };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      current_rate: currentRate,
      opening_balance: openingBalance,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  return { id: data.id };
}
