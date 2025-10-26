-- Enable realtime for csv_uploads table so the UI can automatically refresh when new CSVs are generated
ALTER PUBLICATION supabase_realtime ADD TABLE public.csv_uploads;