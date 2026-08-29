import type { H3Event } from 'h3'

export interface AuthedUser {
  id: string
  email: string
}

/** Verifies the caller's Supabase access token (sent as `Authorization: Bearer <token>`), if any. */
export async function getUserFromEvent(event: H3Event): Promise<AuthedUser | null> {
  const header = getHeader(event, 'authorization')
  if (!header?.startsWith('Bearer ')) {
    return null
  }
  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    return null
  }

  const supabase = useSupabasePublic()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return null
  }
  return { id: data.user.id, email: data.user.email ?? '' }
}
