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

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

// Extract price from Booking.com HTML based on Python scraper patterns
function extractPrice(html: string): number | null {
  // Look for various price patterns in Booking.com HTML
  const patterns = [
    // data-hotel-rounded-price attribute
    /data-hotel-rounded-price="(\d+)"/,
    // Price with THB currency symbol
    /THB\s*฿?\s*([\d,]+)/,
    // Price with baht symbol
    /฿\s*([\d,]+)/,
    // Price in JSON-like structures
    /"price[_-]?amount[":\s]+(\d+)/i,
    // Price test ids
    /data-testid="price[^"]*"[^>]*>[\s\S]*?(\d{3,6})/,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const priceStr = match[1].replace(/,/g, '').replace(/\s/g, '');
      const price = parseInt(priceStr, 10);
      if (!isNaN(price) && price > 100 && price < 100000) {
        return price;
      }
    }
  }
  
  return null;
}

// Scrape booking.com for a specific date (based on Python scraper logic)
async function scrapeBookingRate(url: string, checkInDate: string): Promise<number | null> {
  try {
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    const checkOut = checkOutDate.toISOString().split('T')[0];
    
    // Build URL with query parameters like Python scraper
    const urlObj = new URL(url);
    urlObj.searchParams.set('checkin', checkInDate);
    urlObj.searchParams.set('checkout', checkOut);
    urlObj.searchParams.set('group_adults', '2');
    urlObj.searchParams.set('no_rooms', '1');
    urlObj.searchParams.set('selected_currency', 'THB');
    urlObj.searchParams.set('sb_price_type', 'total');
    
    const response = await fetch(urlObj.toString(), {
      headers: {
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
    });
    
    if (response.status !== 200) {
      console.log(`Failed to fetch ${url} for ${checkInDate}: HTTP ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    const price = extractPrice(html);
    
    if (price) {
      console.log(`Extracted price ${price} THB for ${checkInDate}`);
    } else {
      console.log(`No price found for ${checkInDate}`);
    }
    
    return price;
  } catch (error) {
    console.error(`Error scraping ${url} for ${checkInDate}:`, error);
    return null;
  }
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
    console.log('Property URL:', propertyUrl);
    console.log('Competitors to scrape:', competitors.length);

    // Check if this period was recently scraped
    const { data: recentData } = await supabase
      .from('scraped_rates')
      .select('check_in_date')
      .gte('check_in_date', startDate)
      .lte('check_in_date', endDate)
      .gte('scraped_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .limit(1);

    const hasRecentData = recentData && recentData.length > 0;

    // Generate list of dates
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date).toISOString().split('T')[0]);
    }

    const scrapedData = [];
    const allHotels = [
      { id: propertyId, name: propertyName, url: propertyUrl, isProperty: true },
      ...competitors.map(c => ({ ...c, isProperty: false }))
    ];

    let completed = 0;
    const total = allHotels.length * dates.length;

    // Scrape each hotel (property + competitors)
    for (const hotel of allHotels) {
      if (!hotel.url) {
        console.log(`Skipping ${hotel.name}: No URL provided`);
        continue;
      }

      console.log(`Scraping ${hotel.name}...`);
      
      for (const checkInDate of dates) {
        try {
          const price = await scrapeBookingRate(hotel.url, checkInDate);
          
          if (price !== null) {
            const checkOutDate = new Date(checkInDate);
            checkOutDate.setDate(checkOutDate.getDate() + 1);
            
            const rateData: any = {
              check_in_date: checkInDate,
              check_out_date: checkOutDate.toISOString().split('T')[0],
              room_type: 'Standard Room',
              price_amount: price,
              currency: 'THB',
              scraped_at: new Date().toISOString(),
            };

            // Set either competitor_id or property_id based on hotel type
            if (hotel.isProperty) {
              rateData.property_id = hotel.id;
              rateData.competitor_id = null;
            } else {
              rateData.competitor_id = hotel.id;
              rateData.property_id = null;
            }

            const { error: insertError } = await supabase
              .from('scraped_rates')
              .insert(rateData);

            if (insertError) {
              console.error('Error inserting rate:', insertError);
            } else {
              scrapedData.push({
                hotel: hotel.name,
                date: checkInDate,
                price: price,
              });
            }
          }
          
          completed++;
          const progress = Math.round((completed / total) * 100);
          console.log(`Progress: ${progress}% (${completed}/${total})`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
          console.error(`Error scraping ${hotel.name} for ${checkInDate}:`, error);
          completed++;
        }
      }
    }

    console.log(`Successfully scraped ${scrapedData.length} rates`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scraped ${scrapedData.length} rates for ${allHotels.length} hotels across ${dates.length} dates`,
        hasRecentData,
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
