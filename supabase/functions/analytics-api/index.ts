import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsQuery {
  startDate?: string | null;
  endDate?: string | null;
  propertyId?: string | null;
  competitorId?: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();
    
    // Parse query parameters
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const propertyId = url.searchParams.get('propertyId');
    const competitorId = url.searchParams.get('competitorId');

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Analytics API called - endpoint: ${endpoint}, params:`, { startDate, endDate, propertyId, competitorId });

    let data;
    let error;

    switch (endpoint) {
      case 'rates-summary': {
        // Get aggregated rates data for Power BI
        const result = await getRatesSummary(supabase, { startDate, endDate, propertyId, competitorId });
        data = result.data;
        error = result.error;
        break;
      }

      case 'daily-rates': {
        // Get daily rates breakdown
        const result = await getDailyRates(supabase, { startDate, endDate, propertyId, competitorId });
        data = result.data;
        error = result.error;
        break;
      }

      case 'competitor-comparison': {
        // Get competitor comparison data
        const result = await getCompetitorComparison(supabase, { startDate, endDate, propertyId });
        data = result.data;
        error = result.error;
        break;
      }

      case 'properties': {
        // Get all properties
        const result = await supabase.from('properties').select('id, name, booking_url, created_at');
        data = result.data;
        error = result.error;
        break;
      }

      case 'competitors': {
        // Get all competitors with property info
        const result = await supabase
          .from('competitors')
          .select('id, name, booking_url, property_id, properties(name)')
          .order('name');
        data = result.data;
        error = result.error;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Unknown endpoint',
            availableEndpoints: [
              '/rates-summary',
              '/daily-rates', 
              '/competitor-comparison',
              '/properties',
              '/competitors'
            ]
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getRatesSummary(supabase: any, params: AnalyticsQuery) {
  let query = supabase
    .from('scraped_rates')
    .select(`
      id,
      check_in_date,
      check_out_date,
      price_amount,
      currency,
      room_type,
      adults,
      scraped_at,
      property_id,
      competitor_id,
      properties(name, booking_url),
      competitors(name, booking_url)
    `);

  if (params.startDate) {
    query = query.gte('check_in_date', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('check_in_date', params.endDate);
  }
  if (params.propertyId) {
    query = query.eq('property_id', params.propertyId);
  }
  if (params.competitorId) {
    query = query.eq('competitor_id', params.competitorId);
  }

  const { data, error } = await query.order('check_in_date', { ascending: true });

  return { data, error };
}

async function getDailyRates(supabase: any, params: AnalyticsQuery) {
  let query = supabase
    .from('scraped_rates')
    .select(`
      check_in_date,
      price_amount,
      currency,
      adults,
      property_id,
      competitor_id,
      properties(name),
      competitors(name)
    `);

  if (params.startDate) {
    query = query.gte('check_in_date', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('check_in_date', params.endDate);
  }
  if (params.propertyId) {
    query = query.eq('property_id', params.propertyId);
  }
  if (params.competitorId) {
    query = query.eq('competitor_id', params.competitorId);
  }

  const { data, error } = await query.order('check_in_date', { ascending: true });

  // Group by date and calculate averages
  if (data) {
    const grouped = data.reduce((acc: any, rate: any) => {
      const date = rate.check_in_date;
      if (!acc[date]) {
        acc[date] = {
          date,
          rates: [],
          avgPrice: 0,
          minPrice: Infinity,
          maxPrice: 0,
          count: 0
        };
      }
      acc[date].rates.push(rate.price_amount);
      acc[date].count++;
      acc[date].avgPrice = acc[date].rates.reduce((sum: number, p: number) => sum + p, 0) / acc[date].count;
      acc[date].minPrice = Math.min(acc[date].minPrice, rate.price_amount);
      acc[date].maxPrice = Math.max(acc[date].maxPrice, rate.price_amount);
      return acc;
    }, {});

    return { data: Object.values(grouped), error: null };
  }

  return { data, error };
}

async function getCompetitorComparison(supabase: any, params: AnalyticsQuery) {
  let query = supabase
    .from('scraped_rates')
    .select(`
      check_in_date,
      price_amount,
      currency,
      adults,
      room_type,
      property_id,
      competitor_id,
      properties(name),
      competitors(name)
    `);

  if (params.startDate) {
    query = query.gte('check_in_date', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('check_in_date', params.endDate);
  }
  if (params.propertyId) {
    // Get both property and its competitors
    const { data: competitors } = await supabase
      .from('competitors')
      .select('id')
      .eq('property_id', params.propertyId);
    
    if (competitors) {
      const competitorIds = competitors.map((c: any) => c.id);
      query = query.or(`property_id.eq.${params.propertyId},competitor_id.in.(${competitorIds.join(',')})`);
    }
  }

  const { data, error } = await query.order('check_in_date', { ascending: true });

  return { data, error };
}
