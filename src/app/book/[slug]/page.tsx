import { createAdminClient } from "@/lib/supabase/admin";
import { BookingPageClient } from "@/components/booking/booking-page-client";

interface BookingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  // Look up therapist settings by booking slug
  const { data: settings } = await supabase
    .from("therapist_settings")
    .select("user_id, session_duration_minutes, practice_name, practice_address")
    .eq("booking_slug", slug)
    .single();

  if (!settings) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This booking page does not exist or is no longer available.
        </p>
      </div>
    );
  }

  // Look up therapist name
  const { data: therapist } = await supabase
    .from("therapists")
    .select("name")
    .eq("user_id", settings.user_id)
    .single();

  const therapistName = therapist?.name || "Therapist";

  return (
    <BookingPageClient
      slug={slug}
      therapistName={therapistName}
      practiceName={settings.practice_name}
      duration={settings.session_duration_minutes}
    />
  );
}
