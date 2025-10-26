-- Enable realtime for scraped_rates table so the UI can automatically refresh when new data arrives
ALTER PUBLICATION supabase_realtime ADD TABLE public.scraped_rates;