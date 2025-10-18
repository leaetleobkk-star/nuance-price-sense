-- Create storage bucket for CSV files
INSERT INTO storage.buckets (id, name, public)
VALUES ('rate-csvs', 'rate-csvs', false);

-- Create RLS policies for CSV storage
CREATE POLICY "Users can upload CSVs for their properties"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'rate-csvs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own CSVs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'rate-csvs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own CSVs"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'rate-csvs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own CSVs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'rate-csvs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);