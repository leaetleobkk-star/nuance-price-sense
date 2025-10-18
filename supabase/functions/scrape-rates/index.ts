import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompetitorInfo {
  id: string;
  name: string;
  url: string;
}

interface RequestBody {
  propertyId: string;
  propertyName: string;
  propertyUrl: string | null;
  competitors: CompetitorInfo[];
  startDate: string;
  endDate: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { propertyId, propertyName, propertyUrl, competitors, startDate, endDate }: RequestBody = await req.json();

    console.log('Starting rate scraping for property:', propertyName);
    console.log('Date range:', startDate, 'to', endDate);
    console.log('Competitors to scrape:', competitors.length);

    // Calculate dates based on provided range
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const checkInDate = new Date(date);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkInDate.getDate() + 1); // 1 night stay
      
      dates.push({
        checkIn: checkInDate.toISOString().split('T')[0],
        checkOut: checkOutDate.toISOString().split('T')[0],
      });
    }

    const scrapedData = [];

    // Scrape each competitor
    for (const competitor of competitors) {
      console.log(`Scraping ${competitor.name}...`);
      
      for (const dateRange of dates) {
        try {
          // TODO: Implement actual scraping logic here
          // This is a placeholder that would need to be replaced with actual
          // web scraping using a service like Firecrawl, Puppeteer, or similar
          
          // For now, we'll generate mock data
          const mockPrice = Math.floor(Math.random() * 5000) + 3000;
          
          const { error: insertError } = await supabase
            .from('scraped_rates')
            .insert({
              competitor_id: competitor.id,
              check_in_date: dateRange.checkIn,
              check_out_date: dateRange.checkOut,
              price_amount: mockPrice,
              currency: 'THB',
              room_type: 'Standard Room',
              scraped_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error('Error inserting rate:', insertError);
          } else {
            scrapedData.push({
              competitor: competitor.name,
              date: dateRange.checkIn,
              price: mockPrice,
            });
          }
        } catch (error) {
          console.error(`Error scraping ${competitor.name} for ${dateRange.checkIn}:`, error);
        }
      }
    }

    console.log(`Successfully scraped ${scrapedData.length} rates`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scraped ${scrapedData.length} rates for ${competitors.length} competitors across ${dates.length} dates`,
        data: scrapedData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in scrape-rates function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
