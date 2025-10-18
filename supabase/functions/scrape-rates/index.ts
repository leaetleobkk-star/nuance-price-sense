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

// Extract price from Booking.com content using multiple strategies
function extractPrice(content: string): number | null {
  console.log('Attempting to extract price from content...');

  const candidates: number[] = [];
  
  // Strategy 1: Look for price in markdown format (from Firecrawl)
  const markdownPricePatterns = [
    /THB\s*฿?\s*([\d,]+)/gi,
    /฿\s*([\d,]+)/g,
    /(?:total|night|price|from|lowest)[\s\S]{0,80}?฿?\s*([\d,]+)/gi,
  ];
  
  for (const pattern of markdownPricePatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const priceStr = match[1].replace(/,/g, '').replace(/\s/g, '');
       const price = parseInt(priceStr, 10);
       if (!isNaN(price) && price > 1000 && price < 50000) {
        candidates.push(price);
      }
    }
  }
  
  // Strategy 2: Look for structured data patterns
  const htmlPatterns = [
    /data-hotel-rounded-price="(\d+)"/g,
    /"priceBreakdown"[\s\S]{0,200}?"grossPrice"[\s\S]{0,50}?:\s*"?([\d,]+)"?/g,
    /"value"[\s\S]{0,30}?:\s*"?([\d,]+)"?[\s\S]{0,60}?"currency"[\s\S]{0,30}?:\s*"THB"/g,
  ];
  
  for (const pattern of htmlPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const priceStr = match[1].replace(/,/g, '').replace(/\s/g, '');
       const price = parseInt(priceStr, 10);
       if (!isNaN(price) && price > 1000 && price < 50000) {
        candidates.push(price);
      }
    }
  }

   if (candidates.length) {
     const filtered = candidates.filter(p => p >= 1000 && p <= 50000).sort((a,b) => a - b);
     if (filtered.length) {
       const median = filtered[Math.floor(filtered.length / 2)];
       console.log(`Selected median price ${median} THB from ${filtered.length}/${candidates.length} candidates`);
       return median;
     }
     const best = Math.min(...candidates);
     console.log(`Selected fallback best price ${best} THB from ${candidates.length} candidates`);
     return best;
   }
  
  console.log('No valid price found in content');
  return null;
}

// Scrape booking.com using Firecrawl when available, fallback to direct fetch
async function scrapeBookingRate(url: string, checkInDate: string, firecrawlApiKey?: string): Promise<number | null> {
  try {
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    const checkOut = checkOutDate.toISOString().split('T')[0];
    
    // Build URL with query parameters
    const urlObj = new URL(url);
    urlObj.searchParams.set('checkin', checkInDate);
    urlObj.searchParams.set('checkout', checkOut);
    urlObj.searchParams.set('group_adults', '2');
    urlObj.searchParams.set('no_rooms', '1');
    urlObj.searchParams.set('selected_currency', 'THB');
    urlObj.searchParams.set('sb_price_type', 'total');
    
    const targetUrl = urlObj.toString();

    // Prefer Firecrawl if API key is configured
    if (firecrawlApiKey) {
      console.log(`Scraping with Firecrawl: ${targetUrl}`);
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: targetUrl,
          formats: ['markdown', 'html'],
          onlyMainContent: false,
          waitFor: 1200,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Normalize Firecrawl response shapes
        const contents: string[] = [];
        try {
          if (typeof data.markdown === 'string') contents.push(data.markdown);
          if (typeof data.html === 'string') contents.push(data.html);
          if (data.data) {
            if (typeof data.data.markdown === 'string') contents.push(data.data.markdown);
            if (typeof data.data.html === 'string') contents.push(data.data.html);
            if (Array.isArray(data.data)) {
              for (const doc of data.data) {
                if (typeof doc === 'string') contents.push(doc);
                if (typeof doc?.markdown === 'string') contents.push(doc.markdown);
                if (typeof doc?.html === 'string') contents.push(doc.html);
                if (typeof doc?.content === 'string') contents.push(doc.content);
              }
            }
          }
          if (typeof data.content === 'string') contents.push(data.content);
        } catch (e) {
          console.warn('Could not normalize Firecrawl response:', e);
        }

        // Try to extract price from all available contents, pick the lowest plausible
        const found: number[] = [];
        for (const c of contents) {
          const p = extractPrice(c);
          if (p) found.push(p);
        }

        if (found.length) {
          const best = Math.min(...found);
          return best;
        }
        console.log('Firecrawl returned content but no price matched, falling back to direct fetch...');
      } else {
        const errorText = await response.text();
        console.error(`Firecrawl API error: ${response.status} - ${errorText}`);
        // fall through to direct fetch
      }
    } else {
      console.warn('FIRECRAWL_API_KEY not configured, using direct fetch fallback');
    }

    // Fallback: Direct fetch (may be rate-limited by Booking.com)
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    if (response.status !== 200) {
      console.log(`Direct fetch failed for ${targetUrl}: HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();
    const price = extractPrice(html);
    if (price) {
      console.log(`Extracted price ${price} THB for ${checkInDate} using direct fetch`);
    } else {
      console.log(`No price found via direct fetch for ${checkInDate}`);
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
const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY') || undefined;
    if (!firecrawlApiKey) {
      console.warn('FIRECRAWL_API_KEY not configured - will use direct fetch fallback');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { propertyId, propertyName, propertyUrl, competitors, startDate, endDate }: RequestBody = await req.json();

    console.log('Starting rate scraping for property:', propertyName);
    console.log('Date range:', startDate, 'to', endDate);
    console.log('Property URL:', propertyUrl);
    console.log('Competitors to scrape:', competitors.length);
    console.log('Using Firecrawl API for reliable scraping');

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
          console.log(`Scraping ${hotel.name} for ${checkInDate}...`);
          const price = await scrapeBookingRate(hotel.url, checkInDate, firecrawlApiKey);
          
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
          
          // Longer delay between requests to be respectful and ensure quality
          await new Promise(resolve => setTimeout(resolve, 300));
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
