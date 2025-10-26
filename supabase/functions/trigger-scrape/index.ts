import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrapeRequest {
  property_id: string;
  date_from: string;
  date_to: string;
  adults: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { property_id, date_from, date_to, adults }: ScrapeRequest = await req.json()
    console.log('Scrape request:', { property_id, date_from, date_to, adults })

    // Fetch property data
    const { data: property, error: propertyError } = await supabaseClient
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single()

    if (propertyError || !property) {
      console.error('Property fetch error:', propertyError)
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch competitors for this property
    const { data: competitors, error: competitorsError } = await supabaseClient
      .from('competitors')
      .select('*')
      .eq('property_id', property_id)

    if (competitorsError) {
      console.error('Competitors fetch error:', competitorsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch competitors' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Railway API URL from environment
    const railwayApiUrl = Deno.env.get('RAILWAY_API_URL')
    if (!railwayApiUrl) {
      console.error('RAILWAY_API_URL not configured')
      return new Response(
        JSON.stringify({ error: 'Railway API not configured. Please add RAILWAY_API_URL secret.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare data for Railway
    const scrapePayload = {
      property: {
        id: property.id,
        name: property.name,
        booking_url: property.booking_url,
      },
      competitors: competitors?.map(c => ({
        id: c.id,
        name: c.name,
        booking_url: c.booking_url,
      })) || [],
      date_from,
      date_to,
      adults,
      user_id: user.id,
    }

    console.log('Sending to Railway:', scrapePayload)

    // Call Railway API
    const railwayResponse = await fetch(railwayApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scrapePayload),
    })

    if (!railwayResponse.ok) {
      const errorText = await railwayResponse.text()
      console.error('Railway API error:', errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Railway scraping failed',
          details: errorText 
        }),
        { status: railwayResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const railwayData = await railwayResponse.json()
    console.log('Railway response:', railwayData)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Scraping initiated successfully',
        data: railwayData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in trigger-scrape function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
