// Thin client for the kidstory-api companion service (../kidstory-api). Every
// story read and write in the app goes through here instead of straight to
// Supabase. Framework-agnostic on purpose — shared between the Nitro routes and
// scripts/daily-post.ts, which runs outside Nuxt and has no `useRuntimeConfig()`.
import type { StoryDraft } from './story-authoring'

export interface KidstoryApiConfig {
  baseUrl: string
  // Shared secret for the write endpoints (sent as `X-API-Key`). Reads don't need it.
  apiKey?: string
}

export interface StorySummary {
  slug: string
  title: string
  emoji: string
  excerpt: string
  category: string
  ageRange: string
  readTimeMinutes: number
  tags: string[]
  coverImageUrl: string | null
  publishedAt: string
  isPremium: boolean
}

export interface Story extends StorySummary {
  body: string[]
  locked: boolean
  lockedBodyCount: number | null
}

export interface StoryList {
  total: number
  limit: number
  offset: number
  items: StorySummary[]
}

export interface StoryListFilters {
  category?: string
  ageRange?: string
  tag?: string
  q?: string
  limit?: number
  offset?: number
}

export interface StoryCreateInput extends StoryDraft {
  isPremium?: boolean
  slug?: string
  coverImageUrl?: string | null
  publishedAt?: string
}

export type StoryUpdateInput = Partial<Omit<StoryCreateInput, 'slug'>>

export interface Category {
  slug: string
  label: string
}

export class KidstoryApiError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

// The API's hard cap on `limit` (see list_stories in kidstory-api/app/routers/stories.py).
const MAX_PAGE_SIZE = 100

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Record<string, string | number | undefined>
  body?: unknown
  // Reader's Supabase access token, forwarded so the API can unlock premium stories.
  readerToken?: string | null
  // Write endpoints need the API key; reads are public.
  requireApiKey?: boolean
}

/** FastAPI puts the human-readable error under `detail` — a string, or a list for validation errors. */
function extractDetail(payload: unknown, fallback: string): string {
  const detail = (payload as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const messages = detail
      .map((d) => {
        const loc = Array.isArray(d?.loc) ? d.loc.filter((p: unknown) => p !== 'body').join('.') : ''
        return loc ? `${loc}: ${d?.msg}` : d?.msg
      })
      .filter(Boolean)
    if (messages.length) return messages.join('; ')
  }
  return fallback
}

async function request<T>(config: KidstoryApiConfig, path: string, options: RequestOptions = {}): Promise<T> {
  if (!config.baseUrl) {
    throw new KidstoryApiError(500, 'KIDSTORY_API_URL is not configured.')
  }
  if (options.requireApiKey && !config.apiKey) {
    throw new KidstoryApiError(500, 'KIDSTORY_API_KEY is not configured.')
  }

  const url = new URL(path.replace(/^\//, ''), config.baseUrl.replace(/\/?$/, '/'))
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.requireApiKey) headers['X-API-Key'] = config.apiKey!
  if (options.readerToken) headers.Authorization = `Bearer ${options.readerToken}`

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    })
  } catch (err: any) {
    throw new KidstoryApiError(502, `Could not reach kidstory-api at ${config.baseUrl}: ${err?.message ?? err}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new KidstoryApiError(response.status, extractDetail(payload, `kidstory-api request failed (${response.status}).`))
  }
  return payload as T
}

export function listCategories(config: KidstoryApiConfig): Promise<Category[]> {
  return request<Category[]>(config, '/categories')
}

export function listStories(config: KidstoryApiConfig, filters: StoryListFilters = {}): Promise<StoryList> {
  return request<StoryList>(config, '/stories', { query: { ...filters } })
}

/** Every story matching the filters, newest first — pages through the API's 100-item cap. */
export async function listAllStories(
  config: KidstoryApiConfig,
  filters: Omit<StoryListFilters, 'limit' | 'offset'> = {}
): Promise<StorySummary[]> {
  const items: StorySummary[] = []
  let offset = 0
  for (;;) {
    const page = await listStories(config, { ...filters, limit: MAX_PAGE_SIZE, offset })
    items.push(...page.items)
    offset += page.items.length
    if (page.items.length === 0 || offset >= page.total) break
  }
  return items
}

export function getStory(config: KidstoryApiConfig, slug: string, readerToken?: string | null): Promise<Story> {
  return request<Story>(config, `/stories/${encodeURIComponent(slug)}`, { readerToken })
}

export function createStory(config: KidstoryApiConfig, input: StoryCreateInput): Promise<Story> {
  return request<Story>(config, '/stories', { method: 'POST', body: input, requireApiKey: true })
}

export function updateStory(config: KidstoryApiConfig, slug: string, changes: StoryUpdateInput): Promise<Story> {
  return request<Story>(config, `/stories/${encodeURIComponent(slug)}`, { method: 'PATCH', body: changes, requireApiKey: true })
}

export function deleteStory(config: KidstoryApiConfig, slug: string): Promise<void> {
  return request<void>(config, `/stories/${encodeURIComponent(slug)}`, { method: 'DELETE', requireApiKey: true })
}
