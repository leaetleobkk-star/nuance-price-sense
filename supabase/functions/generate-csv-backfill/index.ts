// Generate CSV files from recent scraped_rates for a property and/or competitors
// Uses service role and resolves user ownership to store CSVs under the correct user folder

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
const { property_id, competitor_ids = [], hours_window = 6, days_ahead = 60 } = await req.json().catch(() => ({
  property_id: undefined,
  competitor_ids: [],
  hours_window: 6,
  days_ahead: 60,
}))

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const sinceIso = new Date(Date.now() - Number(hours_window) * 60 * 60 * 1000).toISOString()

    async function resolveOwnerUserIdByProperty(propId: string): Promise<string | null> {
      const { data, error } = await admin.from('properties').select('user_id').eq('id', propId).single()
      if (error || !data) return null
      return data.user_id as string
    }

    async function resolveOwnerUserIdByCompetitor(compId: string): Promise<string | null> {
      const { data, error } = await admin.from('competitors').select('property_id').eq('id', compId).single()
      if (error || !data?.property_id) return null
      return await resolveOwnerUserIdByProperty(data.property_id as string)
    }

    async function createCsvForEntity(entity: { property_id?: string; competitor_id?: string }) {
      let ownerUserId: string | null = null
      let filter: Record<string, string> = {}
      let entityType: 'property' | 'competitor'
      let entityId: string

      if (entity.property_id) {
        ownerUserId = await resolveOwnerUserIdByProperty(entity.property_id)
        filter = { property_id: entity.property_id }
        entityType = 'property'
        entityId = entity.property_id
      } else if (entity.competitor_id) {
        ownerUserId = await resolveOwnerUserIdByCompetitor(entity.competitor_id)
        filter = { competitor_id: entity.competitor_id }
        entityType = 'competitor'
        entityId = entity.competitor_id
      } else {
        return { created: false, count: 0 }
      }

      if (!ownerUserId) return { created: false, count: 0 }

let q = admin
        .from('scraped_rates')
        .select('check_in_date, room_type, price_amount, adults, currency, scraped_at')
        // Build a window by check_in_date (next N days) and pick one rate per date
        .gte('check_in_date', new Date().toISOString().slice(0, 10))
        .lte('check_in_date', (() => { const d = new Date(); d.setDate(d.getDate() + Number(days_ahead)); return d.toISOString().slice(0, 10) })())
        .order('check_in_date')
        .order('scraped_at', { ascending: false })

      if (filter.property_id) q = q.eq('property_id', filter.property_id)
      if (filter.competitor_id) q = q.eq('competitor_id', filter.competitor_id)

      const { data: rates, error } = await q
      if (error || !rates || rates.length === 0) return { created: false, count: 0 }

      // Include all scraped rows within the window (no de-duplication)
      const header = 'Date,Room,Price,Adults,Currency'
      const rows = (rates as any[]).map((r) => `${r.check_in_date},${r.room_type || 'N/A'},${r.price_amount},${r.adults || 2},${r.currency || 'THB'}`)
      const csv = [header, ...rows].join('\n')

      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const rand = Math.random().toString(36).slice(2, 8)
      const fileName = `${entityType}_${entityId}_backfill_${ts}_${rand}.csv`
      const filePath = `${ownerUserId}/${fileName}`

      const { error: uploadErr } = await admin.storage.from('rate-csvs').upload(filePath, csv, {
        contentType: 'text/csv',
        upsert: false,
      })
      if (uploadErr) {
        return { created: false, count: 0 }
      }

await admin.from('csv_uploads').insert({
        user_id: ownerUserId,
        property_id: filter.property_id || null,
        competitor_id: filter.competitor_id || null,
        file_name: fileName,
        file_path: filePath,
        record_count: rates.length,
      })

      return { created: true, count: rates.length }
    }

    const results: any = { property: null, competitors: {} }

    if (property_id) {
      results.property = await createCsvForEntity({ property_id })
    }

    if (Array.isArray(competitor_ids)) {
      for (const cid of competitor_ids) {
        const res = await createCsvForEntity({ competitor_id: cid })
        results.competitors[cid] = res
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('generate-csv-backfill error:', e)
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})