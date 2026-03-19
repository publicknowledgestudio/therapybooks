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

  // Use the session returned directly from exchangeCodeForSession — do NOT
  // call getSession() separately, because the Supabase client may return a
  // stale cached session and fail with "Refresh Token Not Found".
  const { data, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession failed:", exchangeError.message);
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const session = data.session;
  const refreshToken = session?.provider_refresh_token;
  const userId = session?.user?.id;
  const email = session?.user?.email;

  console.log("[auth/callback] session from exchange:", {
    hasSession: !!session,
    userId: userId ?? "MISSING",
    email: email ?? "MISSING",
    hasRefreshToken: !!refreshToken,
    hasProviderToken: !!session?.provider_token,
  });

  // Persist Google tokens and calendar ID
  if (userId) {
    try {
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
          console.error("[auth/callback] Update failed:", updateError.message);
        } else {
          console.log("[auth/callback] Settings updated successfully");
        }
      } else {
        console.log("[auth/callback] No updates needed");
      }
    } catch (err) {
      console.error("[auth/callback] Unexpected error:", err);
    }
  } else {
    console.error("[auth/callback] No userId in session after exchange");
  }

  return NextResponse.redirect(`${origin}${next}`);
}
