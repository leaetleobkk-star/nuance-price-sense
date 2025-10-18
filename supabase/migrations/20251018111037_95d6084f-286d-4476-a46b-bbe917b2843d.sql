-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  booking_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- RLS policies for properties
CREATE POLICY "Users can view their own properties"
  ON public.properties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own properties"
  ON public.properties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties"
  ON public.properties FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties"
  ON public.properties FOR DELETE
  USING (auth.uid() = user_id);

-- Create competitors table
CREATE TABLE public.competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  booking_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

-- RLS policies for competitors
CREATE POLICY "Users can view competitors for their properties"
  ON public.competitors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = competitors.property_id
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert competitors for their properties"
  ON public.competitors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = competitors.property_id
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update competitors for their properties"
  ON public.competitors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = competitors.property_id
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete competitors for their properties"
  ON public.competitors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = competitors.property_id
      AND properties.user_id = auth.uid()
    )
  );

-- Create scraped_rates table
CREATE TABLE public.scraped_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  room_type TEXT,
  price_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'THB',
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scraped_rates ENABLE ROW LEVEL SECURITY;

-- RLS policies for scraped_rates
CREATE POLICY "Users can view scraped rates for their competitors"
  ON public.scraped_rates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.competitors
      JOIN public.properties ON properties.id = competitors.property_id
      WHERE competitors.id = scraped_rates.competitor_id
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert scraped rates for their competitors"
  ON public.scraped_rates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competitors
      JOIN public.properties ON properties.id = competitors.property_id
      WHERE competitors.id = scraped_rates.competitor_id
      AND properties.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_properties_user_id ON public.properties(user_id);
CREATE INDEX idx_competitors_property_id ON public.competitors(property_id);
CREATE INDEX idx_scraped_rates_competitor_id ON public.scraped_rates(competitor_id);
CREATE INDEX idx_scraped_rates_dates ON public.scraped_rates(check_in_date, check_out_date);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON public.competitors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();