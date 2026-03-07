import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const bookingId = body.bookingId as number;

  if (!bookingId) {
    return NextResponse.json(
      { error: "Missing bookingId" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Verify the booking belongs to this user (by email) and is not already cancelled
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select(
      "id, client_email, therapist_user_id, session_id, cancelled_at, sessions(id, date, start_time, status)"
    )
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: "Booking not found" },
      { status: 404 }
    );
  }

  if (booking.client_email !== user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (booking.cancelled_at) {
    return NextResponse.json(
      { error: "Booking is already cancelled" },
      { status: 400 }
    );
  }

  const session = booking.sessions as {
    id: number;
    date: string;
    start_time: string | null;
    status: string;
  } | null;

  if (!session) {
    return NextResponse.json(
      { error: "No session linked to this booking" },
      { status: 400 }
    );
  }

  if (session.status === "cancelled") {
    return NextResponse.json(
      { error: "Session is already cancelled" },
      { status: 400 }
    );
  }

  // Check cancellation window
  const { data: settings } = await admin
    .from("therapist_settings")
    .select("cancellation_window_hours")
    .eq("user_id", booking.therapist_user_id)
    .single();

  const cancellationWindowHours = settings?.cancellation_window_hours ?? 24;
  const sessionDateTime = new Date(
    `${session.date}T${session.start_time || "00:00:00"}`
  );
  const deadline = new Date(
    sessionDateTime.getTime() - cancellationWindowHours * 60 * 60 * 1000
  );
  const now = new Date();

  if (now >= deadline) {
    return NextResponse.json(
      { error: "Cancellation deadline has passed" },
      { status: 400 }
    );
  }

  // Cancel the booking
  const { error: updateBookingError } = await admin
    .from("bookings")
    .update({ cancelled_at: now.toISOString() })
    .eq("id", bookingId);

  if (updateBookingError) {
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }

  // Cancel the associated session
  if (booking.session_id) {
    await admin
      .from("sessions")
      .update({ status: "cancelled" })
      .eq("id", booking.session_id);
  }

  return NextResponse.json({ success: true });
}
