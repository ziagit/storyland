import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import ws from 'ws'

// Node 20 has no native WebSocket global, which supabase-js's realtime client
// requires at construction time even though this app never uses realtime.
const realtimeOptions = { transport: ws as unknown as typeof WebSocket }

let adminClient: SupabaseClient | null = null
let publicClient: SupabaseClient | null = null

export function useSupabaseAdmin(): SupabaseClient {
  const config = useRuntimeConfig()
  if (!config.public.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase admin credentials are not configured on the server.' })
  }
  if (!adminClient) {
    adminClient = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false },
      realtime: realtimeOptions
    })
  }
  return adminClient
}

export function useSupabasePublic(): SupabaseClient {
  const config = useRuntimeConfig()
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase is not configured on the server.' })
  }
  if (!publicClient) {
    publicClient = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey, {
      auth: { persistSession: false },
      realtime: realtimeOptions
    })
  }
  return publicClient
}
