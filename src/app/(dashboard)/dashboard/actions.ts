"use server";

import { createClient } from "@/lib/supabase/server";

export async function dismissChangelog(latestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("therapist_settings")
    .update({ last_seen_changelog: latestId })
    .eq("user_id", user.id);
}
