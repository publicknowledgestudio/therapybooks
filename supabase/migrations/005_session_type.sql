-- Add session_type column to distinguish in-person vs video sessions
ALTER TABLE public.sessions
ADD COLUMN session_type text NOT NULL DEFAULT 'in_person';
