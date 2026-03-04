"use server";

// Stub server actions — will be implemented when Supabase schema is wired up

export type TagSuggestion = {
  type: "category" | "invoice" | "contractor";
  category?: string;
  invoice_id?: number;
  invoice_label?: string;
  contractor_id?: number;
  contractor_name?: string;
};

export async function importTransactions(
  _rows: Array<{
    date: string;
    narration: string;
    ref_no: string;
    amount: number;
    balance: number | null;
    category?: string;
    invoice_id?: number;
    contractor_id?: number;
  }>,
  _fileName: string
): Promise<{ count?: number; error?: string }> {
  return { error: "Not implemented yet" };
}

export async function checkDuplicates(
  _rows: Array<{ date: string; amount: number; narration: string }>
): Promise<{ duplicateKeys: string[] }> {
  return { duplicateKeys: [] };
}

export async function suggestTags(
  _rows: Array<{ date: string; amount: number; narration: string }>
): Promise<{ suggestions: Record<string, TagSuggestion[]> }> {
  return { suggestions: {} };
}
