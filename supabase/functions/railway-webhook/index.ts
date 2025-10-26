// Receives scraped rate data from Railway and writes to the database securely
// This endpoint uses a shared secret header and the Service Role key (server-side only)
// Never expose the service role key to the frontend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const WEBHOOK_SECRET = Deno.env.get('RAILWAY_WEBHOOK_SECRET')
    if (!WEBHOOK_SECRET) {
      console.error('Missing RAILWAY_WEBHOOK_SECRET');
      return new Response(JSON.stringify({ error: 'Server is missing webhook secret' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const providedSecret = req.headers.get('x-webhook-secret') || ''
    if (providedSecret !== WEBHOOK_SECRET) {
      console.warn('Invalid webhook secret')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    console.log('Incoming webhook body:', JSON.stringify(body).slice(0, 2000))

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing Supabase envs')
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    // Normalize payload into an array of records to insert
    const records = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : [body])

    const toInsert = [] as any[]

    for (const r of records) {
      // Basic validation and mapping
      const price = Number(r.price_amount ?? r.price ?? r.amount)
      const currency = String(r.currency ?? 'THB')
      const checkIn = r.check_in_date || r.checkIn || r.check_in
      const checkOut = r.check_out_date || r.checkOut || r.check_out

      if (!price || !checkIn || !checkOut) {
        console.warn('Skipping invalid record:', r)
        continue
      }

      toInsert.push({
        property_id: r.property_id ?? null,
        competitor_id: r.competitor_id ?? null,
        room_type: r.room_type ?? null,
        adults: Number(r.adults ?? 2),
        price_amount: price,
        currency,
        check_in_date: new Date(checkIn).toISOString().slice(0, 10),
        check_out_date: new Date(checkOut).toISOString().slice(0, 10),
      })
    }

    if (!toInsert.length) {
      return new Response(JSON.stringify({ message: 'No valid records to insert' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await supabase
      .from('scraped_rates')
      .insert(toInsert)
      .select('id')

    if (error) {
      console.error('DB insert error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ inserted: data?.length ?? 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Unexpected error:', e)
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
