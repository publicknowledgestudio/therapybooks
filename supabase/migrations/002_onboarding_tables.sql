-- Therapist settings (availability, booking config, Google connection)
create table public.therapist_settings (
  id serial primary key,
  user_id uuid references auth.users(id) not null unique,
  therapist_id integer references public.therapists(id),
  google_calendar_id text,
  google_refresh_token text,
  booking_slug text unique,
  session_duration_minutes integer not null default 50,
  break_between_minutes integer not null default 10,
  advance_notice_hours integer not null default 4,
  cancellation_window_hours integer not null default 24,
  working_hours jsonb not null default '{
    "mon": {"start": "09:00", "end": "18:00", "enabled": true},
    "tue": {"start": "09:00", "end": "18:00", "enabled": true},
    "wed": {"start": "09:00", "end": "18:00", "enabled": true},
    "thu": {"start": "09:00", "end": "18:00", "enabled": true},
    "fri": {"start": "09:00", "end": "18:00", "enabled": true},
    "sat": {"start": "09:00", "end": "13:00", "enabled": false},
    "sun": {"start": "09:00", "end": "13:00", "enabled": false}
  }'::jsonb,
  outbound_sync_enabled boolean not null default true,
  onboarding_completed boolean not null default false,
  practice_name text,
  practice_address text,
  practice_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.therapist_settings enable row level security;
create policy "Users can manage own settings" on public.therapist_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bookings (client-initiated, links to sessions)
create table public.bookings (
  id serial primary key,
  therapist_user_id uuid references auth.users(id) not null,
  session_id integer references public.sessions(id),
  client_name text not null,
  client_email text not null,
  client_phone text,
  google_event_id text,
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz
);

alter table public.bookings enable row level security;
-- Therapist can see their bookings
create policy "Therapist can manage own bookings" on public.bookings
  for all using (auth.uid() = therapist_user_id)
  with check (auth.uid() = therapist_user_id);
-- Public can insert bookings (for the booking page)
create policy "Anyone can create bookings" on public.bookings
  for insert with check (true);
