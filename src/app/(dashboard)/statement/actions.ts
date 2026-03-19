"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { allocateSessionPayments } from "@/app/(dashboard)/clients/allocate-payments";

export type TagSuggestion = {
  type: "category" | "invoice" | "contractor";
  category?: string;
  invoice_id?: number;
  invoice_label?: string;
  contractor_id?: number;
  contractor_name?: string;
  client_id?: number;
  client_name?: string;
};

export async function importTransactions(
  rows: Array<{
    date: string;
    narration: string;
    ref_no: string;
    amount: number;
    balance: number | null;
    category?: string;
    invoice_id?: number;
    contractor_id?: number;
    client_id?: number;
  }>,
  fileName: string
): Promise<{ count?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (rows.length === 0) return { error: "No transactions to import" };

  // Insert all transactions
  const toInsert = rows.map((row) => ({
    user_id: user.id,
    date: row.date,
    narration: row.narration,
    amount: row.amount,
    balance: row.balance,
    reference: row.ref_no || null,
    category: row.category || null,
    source: "hdfc_xls",
    bank_file: fileName,
  }));

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert(toInsert)
    .select("id");

  if (error) {
    console.error("Import error:", error);
    return { error: "Failed to import transactions" };
  }

  // Create client_payments for rows with accepted client suggestions
  const clientPayments: Array<{
    user_id: string;
    transaction_id: number;
    client_id: number;
    amount: number;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.client_id && inserted?.[i]) {
      clientPayments.push({
        user_id: user.id,
        transaction_id: inserted[i].id,
        client_id: row.client_id,
        amount: row.amount,
      });
    }
  }

  if (clientPayments.length > 0) {
    const { error: cpError } = await supabase
      .from("client_payments")
      .insert(clientPayments);

    if (cpError) {
      console.error("Client payment linking error:", cpError);
      // Non-fatal — transactions were already imported
    }
  }

  // Re-allocate session payments for each affected client
  const affectedClientIds = [
    ...new Set(clientPayments.map((cp) => cp.client_id)),
  ];
  await Promise.all(
    affectedClientIds.map((cid) => allocateSessionPayments(cid))
  );

  revalidatePath("/statement");

  return { count: inserted?.length ?? 0 };
}

export async function checkDuplicates(
  rows: Array<{ date: string; amount: number; narration: string }>
): Promise<{ duplicateKeys: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { duplicateKeys: [] };

  // Get date range from rows to narrow the query
  const dates = rows.map((r) => r.date).sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const { data: existing } = await supabase
    .from("transactions")
    .select("date, amount, narration")
    .eq("user_id", user.id)
    .gte("date", minDate)
    .lte("date", maxDate);

  if (!existing || existing.length === 0) return { duplicateKeys: [] };

  // Build a set of existing keys
  const existingKeys = new Set(
    existing.map(
      (t) => `${t.date}|${t.amount}|${t.narration ?? ""}`
    )
  );

  // Find which incoming rows are duplicates
  const duplicateKeys = rows
    .filter((r) => existingKeys.has(`${r.date}|${r.amount}|${r.narration}`))
    .map((r) => `${r.date}|${r.amount}|${r.narration}`);

  return { duplicateKeys };
}

export async function suggestTags(
  rows: Array<{ date: string; amount: number; narration: string }>
): Promise<{ suggestions: Record<string, TagSuggestion[]> }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { suggestions: {} };

  // Fetch user's clients for name matching
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, current_rate")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!clients || clients.length === 0) return { suggestions: {} };

  const suggestions: Record<string, TagSuggestion[]> = {};

  for (const row of rows) {
    const key = `${row.date}|${row.amount}|${row.narration}`;
    const rowSuggs: TagSuggestion[] = [];

    // Only match deposits (positive amounts) — these are incoming payments
    if (row.amount > 0) {
      const narrationLower = row.narration.toLowerCase();

      for (const client of clients) {
        // Split client name into parts for matching
        const nameParts = client.name
          .toLowerCase()
          .split(/\s+/)
          .filter((p) => p.length > 2);

        // Check if any significant part of the client name appears in the narration
        const matched = nameParts.some(
          (part) => narrationLower.includes(part)
        );

        // Also check if the amount matches the client's current rate
        const rateMatch =
          client.current_rate != null && row.amount === client.current_rate;

        if (matched || rateMatch) {
          rowSuggs.push({
            type: "category",
            category: "Client Payment",
            client_id: client.id,
            client_name: client.name,
          });
        }
      }
    }

    if (rowSuggs.length > 0) {
      suggestions[key] = rowSuggs;
    }
  }

  return { suggestions };
}

export async function fetchClients(): Promise<
  Array<{ id: number; name: string }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("name");

  return data ?? [];
}

export async function togglePersonal(
  transactionId: number,
  isPersonal: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("transactions")
    .update({ is_personal: isPersonal })
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/statement");
  return {};
}

export async function recordCashPayment(params: {
  clientId: number;
  amount: number;
  date: string;
  notes: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (params.amount <= 0) return { error: "Amount must be positive" };

  // Create transaction
  const narration = params.notes.trim() || "Cash payment";
  const { data: txn, error: txnError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      date: params.date,
      narration,
      amount: params.amount,
      source: "manual",
      type: "cash",
      category: "Client Payment",
    })
    .select("id")
    .single();

  if (txnError || !txn)
    return { error: txnError?.message ?? "Failed to create transaction" };

  // Link to client
  const { error: cpError } = await supabase.from("client_payments").insert({
    user_id: user.id,
    transaction_id: txn.id,
    client_id: params.clientId,
    amount: params.amount,
  });

  if (cpError) return { error: cpError.message };

  // Re-allocate session payments
  await allocateSessionPayments(params.clientId);

  revalidatePath("/statement");
  revalidatePath(`/clients/${params.clientId}`);
  return {};
}
