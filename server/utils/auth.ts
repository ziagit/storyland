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

/** Emails allowed into /studio and the admin routes, from `STUDIO_EMAILS` (comma-separated). */
function studioEmails(): string[] {
  const raw = String(useRuntimeConfig().studioEmails ?? '')
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
}

/**
 * Guards the studio and admin routes: the caller must be signed in, and their email
 * must be on the `STUDIO_EMAILS` list. Fails closed when that list is empty.
 */
export async function requireStudioUser(event: H3Event): Promise<AuthedUser> {
  const user = await getUserFromEvent(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Please sign in to use the studio.' })
  }
  if (!studioEmails().includes(user.email.toLowerCase())) {
    throw createError({ statusCode: 403, statusMessage: "This account doesn't have studio access." })
  }
  return user
}
