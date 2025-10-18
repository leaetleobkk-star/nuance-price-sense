-- Make booking_url optional in competitors table since we're uploading CSVs instead
ALTER TABLE public.competitors ALTER COLUMN booking_url DROP NOT NULL;