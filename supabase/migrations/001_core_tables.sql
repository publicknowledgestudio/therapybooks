-- Clients
create table public.clients (
  id serial primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  phone text,
  email text,
  current_rate numeric,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;
create policy "Users can manage own clients" on public.clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sessions
create type public.session_status as enum ('scheduled', 'confirmed', 'cancelled', 'no_show');

create table public.sessions (
  id serial primary key,
  user_id uuid references auth.users(id) not null,
  client_id integer references public.clients(id) not null,
  date date not null,
  start_time time,
  end_time time,
  duration_minutes integer,
  rate numeric,
  status public.session_status not null default 'scheduled',
  is_chargeable boolean not null default true,
  source text,
  google_event_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sessions enable row level security;
create policy "Users can manage own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Transactions
create table public.transactions (
  id serial primary key,
  user_id uuid references auth.users(id) not null,
  date date not null,
  narration text,
  amount numeric not null,
  balance numeric,
  reference text,
  category text,
  is_personal boolean default false,
  source text,
  bank_file text,
  data_issues text,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
create policy "Users can manage own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Client Payments (transaction -> client junction)
create table public.client_payments (
  id serial primary key,
  user_id uuid references auth.users(id) not null,
  transaction_id integer references public.transactions(id) not null,
  client_id integer references public.clients(id) not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

alter table public.client_payments enable row level security;
create policy "Users can manage own client_payments" on public.client_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Session Payments (transaction -> session junction)
create table public.session_payments (
  id serial primary key,
  user_id uuid references auth.users(id) not null,
  transaction_id integer references public.transactions(id) not null,
  session_id integer references public.sessions(id) not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

alter table public.session_payments enable row level security;
create policy "Users can manage own session_payments" on public.session_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Invoices
create type public.invoice_status as enum ('draft', 'sent', 'paid');

create table public.invoices (
  id serial primary key,
  user_id uuid references auth.users(id) not null,
  invoice_number integer,
  client_id integer references public.clients(id) not null,
  date date not null,
  amount numeric not null,
  description text,
  status public.invoice_status not null default 'draft',
  pdf_path text,
  created_at timestamptz not null default now()
);

alter table public.invoices enable row level security;
create policy "Users can manage own invoices" on public.invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Therapists (practice roster)
create table public.therapists (
  id serial primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  email text,
  phone text,
  slug text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.therapists enable row level security;
create policy "Users can manage own therapists" on public.therapists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
