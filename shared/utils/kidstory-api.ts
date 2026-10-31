// Thin client for the kidstory-api companion service (../kidstory-api). Every
// story read and write in the app goes through here instead of straight to
// Supabase. Framework-agnostic on purpose — shared between the Nitro routes and
// scripts/daily-post.ts, which runs outside Nuxt and has no `useRuntimeConfig()`.
import type { ChatMessage, StoryDraft } from './story-authoring'

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
}

export interface Story extends StorySummary {
  body: string[]
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
  slug?: string
  coverImageUrl?: string | null
  publishedAt?: string
}

export type StoryUpdateInput = Partial<Omit<StoryCreateInput, 'slug'>>

export interface StoryAgentInput {
  // A premise to build on; left out, the agent chooses one from the catalog's gaps.
  // With `draft`, the change asked for instead ("make it shorter").
  topic?: string
  // Fixed when given; otherwise the agent chooses.
  category?: string
  ageRange?: string
  // The story to revise. Left out, the agent writes a new one.
  draft?: StoryDraft
  // Earlier turns of a /studio conversation, as returned by the last call.
  history?: ChatMessage[]
  // What asked for the story, shown on the admin dashboard's agent machine.
  source?: AgentRunSource
}

export type AgentRunSource = 'studio' | 'cron' | 'partner' | 'mcp'

/** One agent run (or story publish) from `GET /agents/activity`. */
export interface AgentRun {
  id: string
  agent: 'story' | 'social' | 'books' | 'support' | 'visitors'
  // 'run', or 'publish' for a story going live.
  action: string
  status: 'running' | 'done' | 'failed'
  // What started it and where its work went: { source }, { kind, platforms }, { published }, { handoff }…
  detail: Record<string, any>
  startedAt: string
  finishedAt: string | null
}

/** Visitors and time on the site, from `GET /visitors/stats`. Times are in seconds. */
export interface VisitorPeriod {
  from: string
  to: string
  visitors: number
  newVisitors: number
  returningVisitors: number
  visits: number
  pageViews: number
  totalSeconds: number
  avgVisitSeconds: number
  medianVisitSeconds: number
  avgSecondsPerVisitor: number
  // Share of visits that left after one page and under 10 seconds, 0 to 1.
  bounceRate: number
  // One entry per day in the owner's time zone (PKT), oldest first.
  daily: { date: string; visitors: number; visits: number; avgVisitSeconds: number }[]
  topPages: { path: string; visits: number; seconds: number; avgSeconds: number }[]
  entryPages: { name: string; visits: number }[]
  referrers: { name: string; visits: number }[]
  devices: { name: string; visits: number }[]
  countries: { name: string; visits: number }[]
}

export interface VisitorStats {
  days: number
  // Visitors seen in the last two minutes.
  liveNow: number
  allTime: {
    visitors: number
    visits: number
    pageViews: number
    totalSeconds: number
    avgVisitSeconds: number
    trackingSince: string | null
  }
  period: VisitorPeriod
}

export interface VisitorsAgentInput {
  days?: number
  question?: string
}

export interface VisitorsAgentResult {
  report: string
  steps: AgentStep[]
}

export interface AgentStep {
  tool: string
  detail: string
}

export interface StoryAgentResult {
  draft: StoryDraft
  // The agent's one-line account of why it wrote this story, or what it changed.
  notes: string
  steps: AgentStep[]
  // The conversation including this turn — send it back with the next request.
  history: ChatMessage[]
}

export interface SocialAgentInput {
  slug: string
  // What `slug` names: a story (the default) or a Book Picks digest.
  kind?: 'story' | 'books'
  siteUrl?: string
  dryRun?: boolean
}

export interface SocialPostResult {
  platform: 'facebook' | 'instagram' | 'email' | 'youtube'
  status: 'posted' | 'dry_run' | 'skipped' | 'failed'
  text: string | null
  postId: string | null
  error: string | null
}

export interface SocialAgentResult {
  posts: SocialPostResult[]
  notes: string
  steps: AgentStep[]
}

export interface BookPick {
  title: string
  author: string
  // e.g. "3-5" or "8-12", as the agent wrote it.
  ages: string
  why: string
}

export interface BookDigestSummary {
  slug: string
  title: string
  emoji: string
  excerpt: string
  coverImageUrl: string | null
  publishedAt: string
}

export interface BookDigest extends BookDigestSummary {
  body: string[]
  books: BookPick[]
  sources: { title: string; url: string }[]
}

export interface BookDigestList {
  total: number
  limit: number
  offset: number
  items: BookDigestSummary[]
}

export interface BooksAgentInput {
  // An angle to take ("picture books"). Left out, the agent picks one.
  focus?: string
  // Research and write, but don't save.
  dryRun?: boolean
}

export interface BooksAgentResult {
  digest: BookDigest
  published: boolean
  // The agent's one-line account of the angle it chose.
  notes: string
  steps: AgentStep[]
}

export interface SupportAgentInput {
  // What the reader just typed into the chat bubble.
  message: string
  // Earlier turns of the chat, as returned by the last call.
  history?: ChatMessage[]
}

export interface SupportHandoff {
  summary: string
  // What the reader gave; null when they're signed in (their account email applies).
  contactEmail: string | null
}

export interface SupportAgentResult {
  reply: string
  // Set when the agent handed the conversation to the owner this turn.
  handoff: SupportHandoff | null
  steps: AgentStep[]
  history: ChatMessage[]
}

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
  // Reader's Supabase access token, forwarded so the support agent knows they're signed in.
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

export function getStory(config: KidstoryApiConfig, slug: string): Promise<Story> {
  return request<Story>(config, `/stories/${encodeURIComponent(slug)}`)
}

export function createStory(config: KidstoryApiConfig, input: StoryCreateInput): Promise<Story> {
  return request<Story>(config, '/stories', { method: 'POST', body: input, requireApiKey: true })
}

/** Runs the story agent (`POST /agents/story`): it writes or revises a story and checks it. Nothing is saved. */
export function runStoryAgent(config: KidstoryApiConfig, input: StoryAgentInput = {}): Promise<StoryAgentResult> {
  return request<StoryAgentResult>(config, '/agents/story', { method: 'POST', body: input, requireApiKey: true })
}

/** Runs the social agent (`POST /agents/social`): it writes and publishes posts for a published story. */
export function runSocialAgent(config: KidstoryApiConfig, input: SocialAgentInput): Promise<SocialAgentResult> {
  return request<SocialAgentResult>(config, '/agents/social', { method: 'POST', body: input, requireApiKey: true })
}

/** Runs the books agent (`POST /agents/books`): it researches what children's books are selling and publishes a digest. */
export function runBooksAgent(config: KidstoryApiConfig, input: BooksAgentInput = {}): Promise<BooksAgentResult> {
  return request<BooksAgentResult>(config, '/agents/books', { method: 'POST', body: input, requireApiKey: true })
}

export function listBookDigests(config: KidstoryApiConfig, page: { limit?: number; offset?: number } = {}): Promise<BookDigestList> {
  return request<BookDigestList>(config, '/books', { query: { ...page } })
}

export function getBookDigest(config: KidstoryApiConfig, slug: string): Promise<BookDigest> {
  return request<BookDigest>(config, `/books/${encodeURIComponent(slug)}`)
}

/** Runs the support agent (`POST /agents/support`) on one chat message. Read-only; a handoff is for the caller to deliver. */
export function runSupportAgent(
  config: KidstoryApiConfig,
  input: SupportAgentInput,
  readerToken?: string | null
): Promise<SupportAgentResult> {
  return request<SupportAgentResult>(config, '/agents/support', {
    method: 'POST',
    body: input,
    readerToken,
    requireApiKey: true
  })
}

/** Visitors and time on the site for the last `days` days, with all-time totals (`GET /visitors/stats`). */
export function getVisitorStats(config: KidstoryApiConfig, days = 30): Promise<VisitorStats> {
  return request<VisitorStats>(config, '/visitors/stats', { query: { days }, requireApiKey: true })
}

/** Runs the visitors agent (`POST /agents/visitors`): a short report on the visit numbers, or an answer to a question. */
export function runVisitorsAgent(config: KidstoryApiConfig, input: VisitorsAgentInput = {}): Promise<VisitorsAgentResult> {
  return request<VisitorsAgentResult>(config, '/agents/visitors', { method: 'POST', body: input, requireApiKey: true })
}

/** Agent runs and story publishes started in the last `seconds`, newest first. */
export function listAgentActivity(config: KidstoryApiConfig, seconds = 600): Promise<AgentRun[]> {
  return request<AgentRun[]>(config, '/agents/activity', { query: { seconds }, requireApiKey: true })
}

export function updateStory(config: KidstoryApiConfig, slug: string, changes: StoryUpdateInput): Promise<Story> {
  return request<Story>(config, `/stories/${encodeURIComponent(slug)}`, { method: 'PATCH', body: changes, requireApiKey: true })
}

export function deleteStory(config: KidstoryApiConfig, slug: string): Promise<void> {
  return request<void>(config, `/stories/${encodeURIComponent(slug)}`, { method: 'DELETE', requireApiKey: true })
}
