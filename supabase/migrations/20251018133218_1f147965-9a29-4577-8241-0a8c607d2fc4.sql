-- Add adults column to track occupancy level (1 or 2 adults)
ALTER TABLE public.scraped_rates 
ADD COLUMN adults integer NOT NULL DEFAULT 2;

-- Add index for querying by adults
CREATE INDEX idx_scraped_rates_adults ON public.scraped_rates(adults);

-- Update RLS policies are already correct (they check via property/competitor relationship)