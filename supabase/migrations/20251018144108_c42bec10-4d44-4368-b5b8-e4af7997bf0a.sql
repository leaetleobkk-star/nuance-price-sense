-- Create table for CSV upload history
CREATE TABLE public.csv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES public.competitors(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  record_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT csv_uploads_property_or_competitor CHECK (
    (property_id IS NOT NULL AND competitor_id IS NULL) OR
    (property_id IS NULL AND competitor_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.csv_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own CSV uploads"
ON public.csv_uploads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own CSV uploads"
ON public.csv_uploads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CSV uploads"
ON public.csv_uploads
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_csv_uploads_user_property ON public.csv_uploads(user_id, property_id);
CREATE INDEX idx_csv_uploads_user_competitor ON public.csv_uploads(user_id, competitor_id);
CREATE INDEX idx_csv_uploads_uploaded_at ON public.csv_uploads(uploaded_at);

-- Create function to clean up old CSV uploads (90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_csv_uploads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.csv_uploads
  WHERE uploaded_at < NOW() - INTERVAL '90 days';
END;
$$;