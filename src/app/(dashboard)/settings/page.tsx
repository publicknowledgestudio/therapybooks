import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { PracticeProfileForm } from "./practice-profile-form";
import { GoogleConnection } from "./google-connection";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch or create settings
  let settings;
  const { data, error } = await supabase
    .from("therapist_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code === "PGRST116") {
    // No row — create default
    const { data: newData } = await supabase
      .from("therapist_settings")
      .insert({
        user_id: user.id,
      })
      .select("*")
      .single();
    settings = newData;
  } else {
    settings = data;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Practice configuration
      </p>

      <div className="mt-10 space-y-10">
        {/* Practice Profile */}
        <section>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
            Practice Profile
          </h3>
          <PracticeProfileForm
            practiceName={settings?.practice_name ?? null}
            practiceAddress={settings?.practice_address ?? null}
            practicePhone={settings?.practice_phone ?? null}
            defaultSessionRate={settings?.default_session_rate ?? null}
          />
        </section>

        <Separator />

        {/* Google Calendar */}
        <section>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
            Google Calendar
          </h3>
          <GoogleConnection
            googleCalendarId={settings?.google_calendar_id ?? null}
            outboundSyncEnabled={settings?.outbound_sync_enabled ?? true}
          />
        </section>

      </div>
    </div>
  );
}
