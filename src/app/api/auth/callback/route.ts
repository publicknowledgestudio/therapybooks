import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    console.error("[auth/callback] No code param in callback URL");
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession failed:", exchangeError.message);
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  // Persist Google tokens and calendar ID
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const refreshToken = session?.provider_refresh_token;
    const userId = session?.user?.id;
    const email = session?.user?.email;

    console.log("[auth/callback] session state:", {
      hasSession: !!session,
      userId: userId ?? "MISSING",
      email: email ?? "MISSING",
      hasRefreshToken: !!refreshToken,
      hasProviderToken: !!session?.provider_token,
    });

    if (!userId) {
      console.error("[auth/callback] No userId after exchangeCodeForSession");
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Check current settings
    const { data: existing, error: fetchError } = await supabase
      .from("therapist_settings")
      .select("google_calendar_id")
      .eq("user_id", userId)
      .single();

    console.log("[auth/callback] existing settings:", {
      found: !!existing,
      googleCalendarId: existing?.google_calendar_id ?? "NULL",
      fetchError: fetchError?.message ?? null,
    });

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("[auth/callback] Failed to fetch settings:", fetchError.message);
    }

    const updates: Record<string, string | null> = {};

    if (refreshToken) {
      updates.google_refresh_token = refreshToken;
    }

    // Auto-set calendar ID to primary (email) if not already configured
    if (!existing?.google_calendar_id && email) {
      updates.google_calendar_id = email;
    }

    if (Object.keys(updates).length > 0) {
      console.log("[auth/callback] Updating therapist_settings:", Object.keys(updates));
      const { error: updateError } = await supabase
        .from("therapist_settings")
        .update(updates)
        .eq("user_id", userId);

      if (updateError) {
        console.error("[auth/callback] Failed to update settings:", updateError.message);
      } else {
        console.log("[auth/callback] Settings updated successfully");
      }
    } else {
      console.log("[auth/callback] No updates needed (calendar already configured, no new refresh token)");
    }
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
