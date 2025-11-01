import { createClient } from '@supabase/supabase-js';

const BI_SUPABASE_URL = 'https://ffxugtzixeliukliaxdj.supabase.co';
const BI_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmeHVndHppeGVsaXVrbGlheGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MDA1MjEsImV4cCI6MjA3Njk3NjUyMX0.jJBsEyCg5NmVZHp4Jkl1-ImxeSaW0g23CXLCNUeYF-E';

export const biSupabase = createClient(BI_SUPABASE_URL, BI_SUPABASE_ANON_KEY);
