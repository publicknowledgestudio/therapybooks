-- Rename invoices table to receipts
alter table public.invoices rename to receipts;

-- Drop unused columns
alter table public.receipts drop column if exists description;
alter table public.receipts drop column if exists pdf_path;

-- Rename invoice_number to receipt_number
alter table public.receipts rename column invoice_number to receipt_number;

-- Replace status enum: convert to text, recreate as receipt_status
alter table public.receipts alter column status drop default;
alter table public.receipts alter column status type text using status::text;
drop type public.invoice_status;
create type public.receipt_status as enum ('generated', 'void');
alter table public.receipts alter column status type public.receipt_status using 'generated'::public.receipt_status;
alter table public.receipts alter column status set default 'generated';

-- Add new columns
alter table public.receipts add column payment_method text default 'bank';
alter table public.receipts add column transaction_id integer references public.transactions(id);

-- Update RLS policy name
alter policy "Users can manage own invoices" on public.receipts rename to "Users can manage own receipts";

-- Receipt-sessions join table
create table public.receipt_sessions (
  id serial primary key,
  receipt_id integer references public.receipts(id) on delete cascade not null,
  session_id integer references public.sessions(id) not null,
  amount numeric not null
);

alter table public.receipt_sessions enable row level security;
create policy "Users can manage own receipt_sessions" on public.receipt_sessions
  for all using (
    exists (select 1 from public.receipts where id = receipt_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.receipts where id = receipt_id and user_id = auth.uid())
  );

-- Add profile fields to therapist_settings
alter table public.therapist_settings add column if not exists pan_number text;
alter table public.therapist_settings add column if not exists registration_number text;
alter table public.therapist_settings add column if not exists clinic_address text;
