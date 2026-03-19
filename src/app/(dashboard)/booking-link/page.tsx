import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { BookingLinkTile } from "@/components/dashboard/booking-link-tile";
import { AvailabilityForm } from "@/app/(dashboard)/settings/availability-form";
import { BookingLink } from "@/app/(dashboard)/settings/booking-link";

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

export default async function BookingLinkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: settings } = await supabase
    .from("therapist_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const bookingSlug = settings?.booking_slug ?? null;
  const userName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
  const workingHours: WorkingHours =
    (settings?.working_hours as WorkingHours) ?? DEFAULT_WORKING_HOURS;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground">Booking Link</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your public booking page and availability
      </p>

      <div className="mt-8">
        <BookingLinkTile bookingSlug={bookingSlug} userName={userName} />
      </div>

      <Separator className="my-8" />

      <section>
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
          Booking URL
        </h3>
        <BookingLink bookingSlug={bookingSlug} userName={userName} />
      </section>

      <Separator className="my-8" />

      <section>
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
          Availability
        </h3>
        <AvailabilityForm
          workingHours={workingHours}
          sessionDurationMinutes={settings?.session_duration_minutes ?? 50}
          breakBetweenMinutes={settings?.break_between_minutes ?? 10}
          advanceNoticeHours={settings?.advance_notice_hours ?? 4}
          cancellationWindowHours={settings?.cancellation_window_hours ?? 24}
        />
      </section>
    </div>
  );
}
