import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { PracticeProfileForm } from "./practice-profile-form";
import { AvailabilityForm } from "./availability-form";
import { GoogleConnection } from "./google-connection";
import { BookingLink } from "./booking-link";

const DEFAULT_WORKING_HOURS = {
  mon: { start: "09:00", end: "18:00", enabled: true },
  tue: { start: "09:00", end: "18:00", enabled: true },
  wed: { start: "09:00", end: "18:00", enabled: true },
  thu: { start: "09:00", end: "18:00", enabled: true },
  fri: { start: "09:00", end: "18:00", enabled: true },
  sat: { start: "09:00", end: "13:00", enabled: false },
  sun: { start: "09:00", end: "13:00", enabled: false },
};

type WorkingHours = Record<
  string,
  { start: string; end: string; enabled: boolean }
>;

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
        working_hours: DEFAULT_WORKING_HOURS,
      })
      .select("*")
      .single();
    settings = newData;
  } else {
    settings = data;
  }

  const workingHours: WorkingHours =
    (settings?.working_hours as WorkingHours) ?? DEFAULT_WORKING_HOURS;

  const userName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;

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
          />
        </section>

        <Separator />

        {/* Availability */}
        <section>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
            Availability
          </h3>
          <AvailabilityForm
            workingHours={workingHours}
            sessionDurationMinutes={settings?.session_duration_minutes ?? 50}
            breakBetweenMinutes={settings?.break_between_minutes ?? 10}
            advanceNoticeHours={settings?.advance_notice_hours ?? 4}
            cancellationWindowHours={
              settings?.cancellation_window_hours ?? 24
            }
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

        <Separator />

        {/* Booking Link */}
        <section>
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
            Booking Link
          </h3>
          <BookingLink
            bookingSlug={settings?.booking_slug ?? null}
            userName={userName}
          />
        </section>
      </div>
    </div>
  );
}
