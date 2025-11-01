-- Add currency field to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Update Atlas Hostel to use HKD
UPDATE public.properties 
SET currency = 'HKD' 
WHERE name ILIKE '%atlas%';