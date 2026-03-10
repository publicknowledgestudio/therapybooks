-- Add default session rate to therapist_settings
ALTER TABLE therapist_settings
ADD COLUMN default_session_rate numeric DEFAULT NULL;
