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
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];

// Currency inference from URL path (e.g., /hotel/th/ -> THB)
const ISO2_TO_CURRENCY: Record<string, string> = {
  th: "THB", sg: "SGD", my: "MYR", id: "IDR", ph: "PHP", vn: "VND",
  jp: "JPY", kr: "KRW", cn: "CNY", hk: "HKD", tw: "TWD", in: "INR",
  us: "USD", gb: "GBP", au: "AUD", nz: "NZD", ca: "CAD",
  de: "EUR", fr: "EUR", es: "EUR", it: "EUR", nl: "EUR", be: "EUR",
};

function inferCurrency(url: string): string {
  try {
    const match = url.match(/\/hotel\/([a-z]{2})\//i);
    if (match) {
      const cc = match[1].toLowerCase();
      return ISO2_TO_CURRENCY[cc] || "USD";
    }
  } catch {
    // ignore
  }
  return "USD";
}

function cleanPriceToInt(text: string): number | null {
  if (!text) return null;
  const match = text.replace(/\s+/g, ' ').match(/(\d[\d\s.,]+)/);
  if (!match) return null;
  const digits = match[1].replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

function canonicalRoomName(name: string): string {
  if (!name) return "";
  // Remove capacity mentions
  name = name.split(/\b(max\s*person|max\s*people|sleeps\s*\d+|guests?:\s*\d+)\b/i)[0];
  return name.replace(/\s{2,}/g, ' ').trim();
}

function isPlausibleRoom(name: string): boolean {
  if (!name) return false;
  // Reject if it's just capacity text
  if (/\b(max\s*person|max\s*people|sleeps|guests?)\b/i.test(name)) return false;
  // Accept if it mentions room types
  return /\b(room|suite|villa|studio|apartment|bungalow|loft|king|queen|twin|double|deluxe|superior|family|premier|executive|dormitory|bed)\b/i.test(name);
}

function roomKey(name: string): string {
  return canonicalRoomName(name).toLowerCase().replace(/\s+/g, ' ');
}

function extractBestPairs(html: string): Array<[string, number]> {
  const out: Array<[string, number]> = [];

  // 1) Legacy table parsing
  const tableMatch = html.match(/<table[^>]*id="hprt-table"[^>]*>([\s\S]*?)<\/table>/i);
  if (tableMatch) {
    const tableHtml = tableMatch[1];
    const rowMatches = tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    
    for (const rowMatch of rowMatches) {
      const row = rowMatch[1];
      
      let name = "";
      // Try extracting room name
      const nameMatch = row.match(/<a[^>]*class="[^"]*hprt-roomtype-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
                       row.match(/<span[^>]*class="[^"]*hprt-roomtype-icon-link[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ||
                       row.match(/<td[^>]*class="[^"]*hprt-roomtype-icon-and-name[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
      if (nameMatch) {
        name = nameMatch[1].replace(/<[^>]+>/g, ' ').trim();
      }
      
      // Try data attribute for price
      let price: number | null = null;
      const priceAttrMatch = row.match(/data-hotel-rounded-price="(\d+)"/);
      if (priceAttrMatch) {
        price = parseInt(priceAttrMatch[1], 10);
      }
      
      // Try price selectors
      if (!price) {
        const priceMatch = row.match(/<[^>]*data-testid="(price-and-discounted-price|price-for-x-nights)"[^>]*>([\s\S]*?)<\/[^>]+>/i) ||
                          row.match(/<div[^>]*class="[^"]*hprt-price-price[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                          row.match(/<span[^>]*class="[^"]*bui-price-display__value[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
        if (priceMatch) {
          price = cleanPriceToInt(priceMatch[2] || priceMatch[0]);
        }
      }
      
      name = canonicalRoomName(name);
      if (name && isPlausibleRoom(name) && price) {
        out.push([name, price]);
      }
    }
  }

  // 2) Modern blocks
  if (out.length === 0) {
    const blockMatches = html.matchAll(/<[^>]*data-component="roomname"[^>]*>([\s\S]*?)<\/[^>]+>/gi);
    for (const blockMatch of blockMatches) {
      const name = canonicalRoomName(blockMatch[1].replace(/<[^>]+>/g, ' ').trim());
      if (!isPlausibleRoom(name)) continue;
      
      // Look for price near this block
      const context = html.substring(Math.max(0, blockMatch.index! - 500), blockMatch.index! + 500);
      const priceMatch = context.match(/<[^>]*data-testid="(price-and-discounted-price|price-for-x-nights)"[^>]*>([\s\S]*?)<\/[^>]+>/i);
      if (priceMatch) {
        const price = cleanPriceToInt(priceMatch[0]);
        if (price) {
          out.push([name, price]);
        }
      }
    }
  }

  // 3) Fallback: find all prices and try to match with nearby room names
  if (out.length === 0) {
    const priceMatches = html.matchAll(/<[^>]*data-testid="(price-and-discounted-price|price-for-x-nights)"[^>]*>([\s\S]*?)<\/[^>]+>/gi);
    for (const priceMatch of priceMatches) {
      const price = cleanPriceToInt(priceMatch[0]);
      if (!price) continue;
      
      const context = html.substring(Math.max(0, priceMatch.index! - 1000), priceMatch.index!);
      const nameMatch = context.match(/<a[^>]*class="[^"]*hprt-roomtype-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
                       context.match(/<[^>]*data-component="roomname"[^>]*>([\s\S]*?)<\/[^>]+>/i);
      if (nameMatch) {
        const name = canonicalRoomName(nameMatch[1].replace(/<[^>]+>/g, ' ').trim());
        if (isPlausibleRoom(name)) {
          out.push([name, price]);
        }
      }
    }
  }

  // Deduplicate: keep cheapest per room type
  const bestPrice: Record<string, number> = {};
  const displayName: Record<string, string> = {};
  
  for (const [name, price] of out) {
    const key = roomKey(name);
    if (!bestPrice[key] || price < bestPrice[key]) {
      bestPrice[key] = price;
      displayName[key] = name;
    }
  }

  const pairs: Array<[string, number]> = Object.keys(bestPrice).map(k => [displayName[k], bestPrice[k]]);
  pairs.sort((a, b) => a[1] - b[1]); // Sort by price ascending
  return pairs;
}

async function scrapeDirectHTTP(url: string, checkInDate: string, adults: number): Promise<{ price: number | null, roomType: string | null }> {
  const checkIn = checkInDate;
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 1);
  const checkOut = checkOutDate.toISOString().split('T')[0];

  const currency = inferCurrency(url);
  const params = new URLSearchParams({
    checkin: checkIn,
    checkout: checkOut,
    group_adults: adults.toString(),
    no_rooms: "1",
    sb_price_type: "total",
    selected_currency: currency,
    do_availability_check: "1",
    src: "hotel"
  });

  const fullUrl = `${url}?${params.toString()}`;
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  try {
    console.log(`Direct HTTP fetch: ${fullUrl}`);
    const response = await fetch(fullUrl, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });

    if (!response.ok) {
      console.log(`Direct fetch failed: HTTP ${response.status}`);
      return { price: null, roomType: null };
    }

    const html = await response.text();
    const pairs = extractBestPairs(html);
    
    if (pairs.length > 0) {
      const [roomName, price] = pairs[0]; // Cheapest room
      console.log(`Direct fetch found: ${roomName} at ${price} ${currency} (adults=${adults})`);
      return { price, roomType: roomName };
    }

    console.log(`Direct fetch: no prices found (adults=${adults})`);
    return { price: null, roomType: null };
  } catch (error) {
    console.error(`Direct fetch error (adults=${adults}):`, error);
    return { price: null, roomType: null };
  }
}

async function scrapeWithFirecrawl(url: string, checkInDate: string, firecrawlApiKey: string, adults: number): Promise<{ price: number | null, roomType: string | null }> {
  const checkIn = checkInDate;
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 1);
  const checkOut = checkOutDate.toISOString().split('T')[0];

  const currency = inferCurrency(url);
  const params = new URLSearchParams({
    checkin: checkIn,
    checkout: checkOut,
    group_adults: adults.toString(),
    no_rooms: "1",
    sb_price_type: "total",
    selected_currency: currency,
    do_availability_check: "1",
    src: "hotel"
  });

  const fullUrl = `${url}?${params.toString()}`;

  try {
    console.log(`Firecrawl fetch: ${fullUrl} (adults=${adults})`);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify({
        url: fullUrl,
        formats: ['html'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Firecrawl API error: ${response.status} - ${errorText}`);
      return { price: null, roomType: null };
    }

    const result = await response.json();
    if (result.success && result.data?.html) {
      const pairs = extractBestPairs(result.data.html);
      if (pairs.length > 0) {
        const [roomName, price] = pairs[0];
        console.log(`Firecrawl found: ${roomName} at ${price} ${currency} (adults=${adults})`);
        return { price, roomType: roomName };
      }
    }

    console.log(`Firecrawl: no prices found (adults=${adults})`);
    return { price: null, roomType: null };
  } catch (error) {
    console.error(`Firecrawl error (adults=${adults}):`, error);
    return { price: null, roomType: null };
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

    // Scrape each hotel (property + competitors)
    let completed = 0;
    const total = allHotels.length * dates.length * 2; // x2 for adults 1 and 2

    for (const hotel of allHotels) {
      if (!hotel.url) {
        console.log(`Skipping ${hotel.name}: No URL provided`);
        continue;
      }

      console.log(`\nScraping ${hotel.name}...`);
      
      for (const checkInDate of dates) {
        // Scrape for both adults=1 and adults=2
        for (const adults of [1, 2]) {
          try {
            console.log(`Scraping ${hotel.name} for ${checkInDate} (adults=${adults})...`);
            
            // Try direct HTTP first
            let result = await scrapeDirectHTTP(hotel.url, checkInDate, adults);
            
            // Fallback to Firecrawl if direct failed
            if (result.price === null && firecrawlApiKey) {
              console.log(`Direct failed, trying Firecrawl (adults=${adults})...`);
              result = await scrapeWithFirecrawl(hotel.url, checkInDate, firecrawlApiKey, adults);
            }

            completed++;
            const progress = Math.round((completed / total) * 100);
            console.log(`Progress: ${progress}% (${completed}/${total})`);

            if (result.price) {
              const checkOutDate = new Date(checkInDate);
              checkOutDate.setDate(checkOutDate.getDate() + 1);
              const currency = inferCurrency(hotel.url);

              const rateData: any = {
                check_in_date: checkInDate,
                check_out_date: checkOutDate.toISOString().split('T')[0],
                room_type: result.roomType || 'Standard Room',
                price_amount: result.price,
                currency: currency,
                adults: adults,
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
                console.error(`Insert error for ${hotel.name} ${checkInDate} (adults=${adults}):`, insertError);
              } else {
                scrapedData.push({
                  hotel: hotel.name,
                  date: checkInDate,
                  adults: adults,
                  price: result.price,
                });
                console.log(`✓ Saved ${hotel.name} ${checkInDate}: ${result.price} ${currency} (adults=${adults})`);
              }
            } else {
              console.log(`✗ No price found for ${hotel.name} ${checkInDate} (adults=${adults})`);
            }
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`Error scraping ${hotel.name} for ${checkInDate} (adults=${adults}):`, error);
            completed++;
          }
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
