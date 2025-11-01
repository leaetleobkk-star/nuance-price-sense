-- Add Little Hotelier credentials columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS lh_email TEXT,
ADD COLUMN IF NOT EXISTS lh_password TEXT,
ADD COLUMN IF NOT EXISTS pms_type TEXT DEFAULT 'na';