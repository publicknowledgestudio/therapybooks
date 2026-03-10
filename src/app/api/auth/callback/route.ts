import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Persist the Google refresh token so background operations
      // (e.g. pushing bookings to Google Calendar) can use it later.
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const refreshToken = session?.provider_refresh_token;
        const userId = session?.user?.id;

        if (refreshToken && userId) {
          await supabase
            .from("therapist_settings")
            .update({ google_refresh_token: refreshToken })
            .eq("user_id", userId);
        }
      } catch (err) {
        // Non-critical — don't block the redirect
        console.error("Failed to persist Google refresh token:", err);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`);
}
