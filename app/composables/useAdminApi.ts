import type { NitroFetchOptions } from 'nitropack'

/** `$fetch` for the admin panel's server routes, carrying the signed-in owner's Supabase token. */
export function useAdminApi() {
  const { accessToken } = useAuth()

  return function adminFetch<T>(url: string, options: NitroFetchOptions<string> = {}): Promise<T> {
    return $fetch<T>(url, {
      ...options,
      headers: { ...(options.headers as Record<string, string> | undefined), Authorization: `Bearer ${accessToken.value}` }
    }) as Promise<T>
  }
}
