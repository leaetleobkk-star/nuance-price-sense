-- Allow NULL for competitor_id so we can store property rates
ALTER TABLE scraped_rates ALTER COLUMN competitor_id DROP NOT NULL;

-- Add property_id column to store rates for the user's own property
ALTER TABLE scraped_rates ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id);

-- Drop existing constraint if it exists
ALTER TABLE scraped_rates DROP CONSTRAINT IF EXISTS check_competitor_or_property;

-- Add constraint to ensure either competitor_id OR property_id is set
ALTER TABLE scraped_rates ADD CONSTRAINT check_competitor_or_property 
  CHECK ((competitor_id IS NOT NULL AND property_id IS NULL) OR (competitor_id IS NULL AND property_id IS NOT NULL));

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view rates for their own property" ON scraped_rates;
DROP POLICY IF EXISTS "Users can insert rates for their own property" ON scraped_rates;

-- Update RLS policies to allow viewing rates for own property
CREATE POLICY "Users can view rates for their own property"
ON scraped_rates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = scraped_rates.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert rates for their own property"
ON scraped_rates FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = scraped_rates.property_id
    AND properties.user_id = auth.uid()
  )
);