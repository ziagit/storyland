import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

let client: SupabaseClient | null = null
let initialized = false

const user = ref<User | null>(null)
const accessToken = ref<string | null>(null)
const hasAccess = ref(false)
const ready = ref(false)

function getClient(): SupabaseClient | null {
  if (!import.meta.client) return null
  if (!client) {
    const config = useRuntimeConfig()
    client = createClient(config.public.supabaseUrl as string, config.public.supabaseAnonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  }
  return client
}

async function refreshAccessStatus() {
  if (!accessToken.value) {
    hasAccess.value = false
    return
  }
  try {
    const res = await $fetch<{ signedIn: boolean; hasAccess: boolean }>('/api/account/status', {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    hasAccess.value = res.hasAccess
  } catch {
    hasAccess.value = false
  }
}

function init() {
  if (initialized || !import.meta.client) return
  initialized = true

  const supabase = getClient()!
  supabase.auth.getSession().then(({ data }) => {
    user.value = data.session?.user ?? null
    accessToken.value = data.session?.access_token ?? null
    ready.value = true
    refreshAccessStatus()
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user ?? null
    accessToken.value = session?.access_token ?? null
    refreshAccessStatus()
  })
}

export function useAuth() {
  init()

  async function signInWithOtp(email: string, redirectPath = '/account'): Promise<{ error: string | null }> {
    const supabase = getClient()
    if (!supabase) return { error: 'Not available.' }
    const redirectTo = `${window.location.origin}${redirectPath}`
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    const supabase = getClient()
    await supabase?.auth.signOut()
    user.value = null
    accessToken.value = null
    hasAccess.value = false
  }

  return { user, accessToken, hasAccess, ready, signInWithOtp, signOut, refreshAccessStatus }
}
