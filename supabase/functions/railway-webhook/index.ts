// Receives scraped rate data from Railway and writes to the database securely
// This endpoint uses a shared secret header and the Service Role key (server-side only)
// Never expose the service role key to the frontend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const authHeader = req.headers.get('authorization') || ''
    const providedSecret = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
    if (providedSecret !== WEBHOOK_SECRET) {
      console.warn('Invalid webhook secret')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    console.log('📡 Railway webhook received:', JSON.stringify(body, null, 2))

    // Handle Railway notification format
    if (body.task_id && body.status) {
      console.log(`✅ Task ${body.task_id} - Status: ${body.status}`)
      console.log(`   Name: ${body.data?.name || 'Unknown'}`)
      console.log(`   Type: ${body.data?.type || 'Unknown'}`)
      
      if (body.data?.stats) {
        console.log(`   Stats:`, JSON.stringify(body.data.stats, null, 2))
      }

      console.log('Checking CSV conditions:', {
        hasRates: !!body.data?.rates,
        isArray: Array.isArray(body.data?.rates),
        hasUserId: !!body.data?.user_id,
        userId: body.data?.user_id
      });

      // Resolve user_id if not provided by Railway (derive from property/competitor owner)
      let resolvedUserId: string | undefined = body.data?.user_id;
      if (!resolvedUserId) {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (SUPABASE_URL && SERVICE_ROLE_KEY) {
          const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
          try {
            if (body.data?.property_id) {
              const { data: prop, error: propErr } = await admin
                .from('properties')
                .select('user_id')
                .eq('id', body.data.property_id)
                .single();
              if (!propErr && prop) resolvedUserId = prop.user_id as string;
            } else if (body.data?.competitor_id) {
              const { data: comp, error: compErr } = await admin
                .from('competitors')
                .select('property_id')
                .eq('id', body.data.competitor_id)
                .single();
              if (!compErr && comp?.property_id) {
                const { data: prop2, error: propErr2 } = await admin
                  .from('properties')
                  .select('user_id')
                  .eq('id', comp.property_id)
                  .single();
                if (!propErr2 && prop2) resolvedUserId = prop2.user_id as string;
              }
            }
          } catch (e) {
            console.error('Failed to resolve user_id for CSV:', e);
          }
        }
      }

      // If Railway sent scraped rates data, save as CSV and insert to database
      if (body.data?.rates && Array.isArray(body.data.rates) && resolvedUserId) {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
        const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
          console.error('Missing Supabase configuration')
          return new Response(JSON.stringify({ error: 'Server not configured' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
          auth: { persistSession: false },
        })

        // Generate CSV content
        const csvRows = ['Date,Room,Price,Adults,Currency'];
        body.data.rates.forEach((rate: any) => {
          csvRows.push(
            `${rate.check_in_date},${rate.room_type || 'N/A'},${rate.price_amount},${rate.adults || 2},${rate.currency || 'THB'}`
          );
        });
        const csvContent = csvRows.join('\n');

        // Upload CSV to storage
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const entityType = body.data.property_id ? 'property' : 'competitor';
        const entityId = body.data.property_id || body.data.competitor_id;
        const fileName = `${entityType}_${entityId}_railway_${timestamp}.csv`;
        const filePath = `${resolvedUserId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('rate-csvs')
          .upload(filePath, csvContent, {
            contentType: 'text/csv',
            upsert: false
          });

        if (uploadError) {
          console.error('Failed to upload CSV:', uploadError);
        } else {
          console.log(`✅ Uploaded CSV: ${fileName}`);

          // Track in csv_uploads table
          const { data: csvRecord, error: csvError } = await supabase.from('csv_uploads').insert({
            user_id: resolvedUserId,
            property_id: body.data.property_id || null,
            competitor_id: body.data.competitor_id || null,
            file_name: fileName,
            file_path: filePath,
            record_count: body.data.rates.length,
          }).select();

          if (csvError) {
            console.error('Failed to track CSV upload:', csvError);
          } else {
            console.log(`✅ CSV upload tracked:`, csvRecord);
          }
        }

        // Insert rates into database
        const ratesToInsert = body.data.rates.map((rate: any) => ({
          property_id: body.data.property_id || null,
          competitor_id: body.data.competitor_id || null,
          room_type: rate.room_type || null,
          adults: Number(rate.adults || 2),
          price_amount: Number(rate.price_amount),
          currency: rate.currency || 'THB',
          check_in_date: rate.check_in_date,
          check_out_date: rate.check_out_date,
        }))

        const { data: insertedRates, error: insertError } = await supabase
          .from('scraped_rates')
          .insert(ratesToInsert)
          .select('id')

        if (insertError) {
          console.error('Failed to insert rates:', insertError)
          return new Response(JSON.stringify({ 
            error: 'Failed to save rates',
            details: insertError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        console.log(`✅ Inserted ${insertedRates?.length || 0} rates into database`)
      }

      // Fallback: if no explicit rates were provided but task completed, generate CSV from existing DB data (next N days, cheapest per day)
      try {
        if ((!body.data?.rates || !Array.isArray(body.data?.rates)) && resolvedUserId && (body.data?.property_id || body.data?.competitor_id)) {
          const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
          const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          if (SUPABASE_URL && SERVICE_ROLE_KEY) {
            const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

            // Build window by check_in_date instead of scraped_at
            const daysAhead = Number(body.data?.days_ahead) || 60;
            const today = new Date();
            const startStr = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10);
            const end = new Date(today);
            end.setDate(end.getDate() + daysAhead);
            const endStr = end.toISOString().slice(0, 10);

            let q = supabase
              .from('scraped_rates')
              .select('check_in_date, room_type, price_amount, adults, currency')
              .gte('check_in_date', startStr)
              .lte('check_in_date', endStr)
              .order('check_in_date')
              .order('price_amount', { ascending: true });

            if (body.data?.property_id) {
              q = q.eq('property_id', body.data.property_id);
            } else if (body.data?.competitor_id) {
              q = q.eq('competitor_id', body.data.competitor_id);
            }

            const { data: windowRates, error: windowErr } = await q;
            if (windowErr) {
              console.error('Failed to fetch rates for CSV window:', windowErr);
            } else if (windowRates && windowRates.length > 0) {
              // Include all scraped rows within the window (no de-duplication)
              const header = 'Date,Room,Price,Adults,Currency';
              const rows = (windowRates as any[]).map((r) => `${r.check_in_date},${r.room_type || 'N/A'},${r.price_amount},${r.adults || 2},${r.currency || 'THB'}`);
              const csvContent = [header, ...rows].join('\n');

              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const entityType = body.data.property_id ? 'property' : 'competitor';
              const entityId = body.data.property_id || body.data.competitor_id;
              const fileName = `${entityType}_${entityId}_railway_${timestamp}.csv`;
              const filePath = `${resolvedUserId}/${fileName}`;

              const { error: uploadError2 } = await supabase.storage
                .from('rate-csvs')
                .upload(filePath, csvContent, {
                  contentType: 'text/csv',
                  upsert: false,
                });

              if (uploadError2) {
                console.error('Failed to upload window CSV:', uploadError2);
              } else {
                const { error: csvError2 } = await supabase.from('csv_uploads').insert({
                  user_id: resolvedUserId,
                  property_id: body.data.property_id || null,
                  competitor_id: body.data.competitor_id || null,
                  file_name: fileName,
                  file_path: filePath,
                  record_count: (windowRates as any[]).length,
                });
                if (csvError2) {
                  console.error('Failed to track window CSV upload:', csvError2);
                } else {
                  console.log(`✅ Window CSV generated and tracked: ${fileName}`);
                }
              }
            } else {
              console.log('No rates found for the requested window to build CSV.');
            }
          }
        }
      } catch (e) {
        console.error('CSV generation (window) failed:', e);
      }

      return new Response(JSON.stringify({ 
        received: true,
        task_id: body.task_id,
        status: body.status,
        timestamp: body.timestamp,
        rates_inserted: body.data?.rates?.length || 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle legacy rate data format (if Railway sends data directly)
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

    const records = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : [body])
    const toInsert = [] as any[]

    for (const r of records) {
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
