import type { KidstoryApiConfig } from '../../shared/utils/kidstory-api'

/** Connection details for the kidstory-api companion service, from runtime config. */
export function useKidstoryApi(): KidstoryApiConfig {
  const config = useRuntimeConfig()
  if (!config.kidstoryApiUrl) {
    throw createError({ statusCode: 500, statusMessage: 'KIDSTORY_API_URL is not configured on the server.' })
  }
  return { baseUrl: config.kidstoryApiUrl, apiKey: config.kidstoryApiKey || undefined }
}

/** Reader's Supabase access token from `Authorization: Bearer <token>`, if any — forwarded to the API as-is. */
export function getReaderToken(event: Parameters<typeof getHeader>[0]): string | null {
  const header = getHeader(event, 'authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim() || null
}
