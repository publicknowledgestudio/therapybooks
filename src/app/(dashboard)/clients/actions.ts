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

const ALLOWED_FIELDS = [
  "name",
  "email",
  "phone",
  "current_rate",
  "opening_balance",
  "notes",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function updateClientAction(
  clientId: number,
  field: string,
  value: string
): Promise<{ success?: boolean; error?: string }> {
  if (!ALLOWED_FIELDS.includes(field as AllowedField)) {
    return { error: "Invalid field" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Per-field validation and parsing
  let parsedValue: string | number | null;
  const trimmed = value.trim();

  switch (field) {
    case "name":
      if (!trimmed) return { error: "Client name is required" };
      parsedValue = trimmed;
      break;
    case "email":
    case "phone":
    case "notes":
      parsedValue = trimmed || null;
      break;
    case "current_rate": {
      if (!trimmed) {
        parsedValue = null;
        break;
      }
      const rate = parseFloat(trimmed);
      if (isNaN(rate) || rate < 0) {
        return { error: "Session rate must be a valid positive number" };
      }
      parsedValue = rate;
      break;
    }
    case "opening_balance": {
      if (!trimmed) {
        parsedValue = 0;
        break;
      }
      const balance = parseFloat(trimmed);
      if (isNaN(balance) || balance < 0) {
        return { error: "Opening balance must be a valid positive number" };
      }
      parsedValue = balance;
      break;
    }
    default:
      return { error: "Invalid field" };
  }

  const { error } = await supabase
    .from("clients")
    .update({ [field]: parsedValue })
    .eq("id", clientId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}
