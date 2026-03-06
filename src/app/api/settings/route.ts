import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const DEFAULT_WORKING_HOURS = {
  mon: { start: "09:00", end: "18:00", enabled: true },
  tue: { start: "09:00", end: "18:00", enabled: true },
  wed: { start: "09:00", end: "18:00", enabled: true },
  thu: { start: "09:00", end: "18:00", enabled: true },
  fri: { start: "09:00", end: "18:00", enabled: true },
  sat: { start: "09:00", end: "13:00", enabled: false },
  sun: { start: "09:00", end: "13:00", enabled: false },
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try to fetch existing settings
  const { data: settings, error: fetchError } = await supabase
    .from("therapist_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (fetchError && fetchError.code === "PGRST116") {
    // No row found — create defaults
    const { data: newSettings, error: insertError } = await supabase
      .from("therapist_settings")
      .insert({
        user_id: user.id,
        working_hours: DEFAULT_WORKING_HOURS,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create settings" },
        { status: 500 }
      );
    }

    return NextResponse.json(newSettings);
  }

  if (fetchError) {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }

  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Remove fields that shouldn't be updated directly
  const { id, user_id, created_at, updated_at, ...updateData } = body;
  void id;
  void user_id;
  void created_at;
  void updated_at;

  const { data: settings, error: updateError } = await supabase
    .from("therapist_settings")
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }

  return NextResponse.json(settings);
}
