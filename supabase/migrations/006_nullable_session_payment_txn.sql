-- Allow session_payments without a linked transaction (e.g. covered by opening balance)
alter table public.session_payments alter column transaction_id drop not null;
