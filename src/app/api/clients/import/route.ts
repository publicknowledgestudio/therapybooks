import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contacts, calendarId } = await request.json();

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json(
      { error: "No contacts provided" },
      { status: 400 },
    );
  }

  // Create client rows
  const clientRows = contacts.map(
    (c: { name: string; email: string | null; phone: string | null }) => ({
      user_id: user.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      is_active: true,
    }),
  );

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .insert(clientRows)
    .select();

  if (clientsError) {
    console.error("Failed to import clients:", clientsError);
    return NextResponse.json(
      { error: "Failed to import clients" },
      { status: 500 },
    );
  }

  // Create or update therapist and settings
  const userName =
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "Therapist";
  const slug = userName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Check if therapist exists first (no unique constraint on user_id)
  const { data: existing } = await supabase
    .from("therapists")
    .select("id")
    .eq("user_id", user.id)
    .single();

  let therapistId: number | null = existing?.id ?? null;

  if (!therapistId) {
    const { data: newTherapist } = await supabase
      .from("therapists")
      .insert({
        user_id: user.id,
        name: userName,
        email: user.email,
        slug,
      })
      .select("id")
      .single();
    therapistId = newTherapist?.id ?? null;
  }

  // Upsert therapist_settings
  const { data: existingSettings } = await supabase
    .from("therapist_settings")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existingSettings) {
    await supabase
      .from("therapist_settings")
      .update({
        therapist_id: therapistId,
        google_calendar_id: calendarId ?? null,
        booking_slug: slug,
        onboarding_completed: true,
      })
      .eq("user_id", user.id);
  } else {
    await supabase.from("therapist_settings").insert({
      user_id: user.id,
      therapist_id: therapistId,
      google_calendar_id: calendarId ?? null,
      booking_slug: slug,
      onboarding_completed: true,
    });
  }

  return NextResponse.json({ imported: clients?.length ?? 0 });
}
