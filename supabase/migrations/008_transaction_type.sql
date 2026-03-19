-- Add type column to distinguish bank vs cash transactions
alter table public.transactions add column type text not null default 'bank';
