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
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user is authenticated
    console.log('Auth header present:', !!authHeader)
    const token = authHeader.replace('Bearer ', '')

    let userResp = await supabaseClient.auth.getUser(token)
    if (userResp.error || !userResp.data.user) {
      // Fallback: try using global header-based session
      userResp = await supabaseClient.auth.getUser()
    }

    const user = userResp.data.user
    const authError = userResp.error
    console.log('Auth check -> hasUser:', !!user, 'error:', authError?.message)

    if (authError || !user) {
      console.error('Authentication failed:', authError)
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

    // Get and normalize Railway API URL from environment
    let railwayApiUrl = (Deno.env.get('RAILWAY_API_URL') || '').trim()
    if (!railwayApiUrl) {
      console.error('RAILWAY_API_URL not configured')
      return new Response(
        JSON.stringify({ error: 'Railway API not configured. Please add RAILWAY_API_URL secret.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!/^https?:\/\//i.test(railwayApiUrl)) {
      railwayApiUrl = `https://${railwayApiUrl}`
    }

    let finalRailwayUrl: string
    try {
      const u = new URL(railwayApiUrl)
      if (!u.pathname || u.pathname === '/') {
        u.pathname = '/api/scrape-from-lovable'
      }
      finalRailwayUrl = u.toString()
    } catch (e) {
      console.error('Invalid RAILWAY_API_URL:', railwayApiUrl, e)
      return new Response(
        JSON.stringify({ error: `Invalid RAILWAY_API_URL: ${railwayApiUrl}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Using Railway endpoint:', finalRailwayUrl)

    // Prepare data for Railway (including LH credentials)
    const scrapePayload = {
      property: {
        id: property.id,
        name: property.name,
        booking_url: property.booking_url,
        lh_email: property.lh_email,
        lh_password: property.lh_password,
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
    const railwayResponse = await fetch(finalRailwayUrl, {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
