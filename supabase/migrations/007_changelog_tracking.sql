-- Track the latest changelog entry each user has seen
alter table public.therapist_settings add column last_seen_changelog text;
