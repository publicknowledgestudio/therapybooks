-- Add opening balance to clients for pre-existing outstanding amounts
alter table clients add column opening_balance numeric default 0;
