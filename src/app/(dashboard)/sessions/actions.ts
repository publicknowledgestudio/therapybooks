"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function cancelSessionAction(
  sessionId: number,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership and current status
  const { data: session } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return { error: "Session not found" };
  }

  if (session.status === "cancelled") {
    return { error: "Session is already cancelled" };
  }

  const { error } = await supabase
    .from("sessions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Failed to cancel session" };
  }

  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  return { success: true };
}
