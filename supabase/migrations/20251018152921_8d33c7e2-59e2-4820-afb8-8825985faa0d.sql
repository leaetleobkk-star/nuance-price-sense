-- Add DELETE policies for scraped_rates table so users can manage their own data

-- Users can delete rates for their own property
CREATE POLICY "Users can delete rates for their own property"
ON scraped_rates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = scraped_rates.property_id
    AND properties.user_id = auth.uid()
  )
);

-- Users can delete scraped rates for their competitors
CREATE POLICY "Users can delete scraped rates for their competitors"
ON scraped_rates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM competitors
    JOIN properties ON properties.id = competitors.property_id
    WHERE competitors.id = scraped_rates.competitor_id
    AND properties.user_id = auth.uid()
  )
);