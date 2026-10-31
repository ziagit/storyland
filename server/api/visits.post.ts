// The visit tracker's beacon (app/plugins/visit-tracker.client.ts): each call
// carries the whole visit so far, and replaces the stored row. Public, so it
// checks every field, keeps the numbers believable, and skips bots. Nothing that
// identifies a person is stored: no IP, only the country Vercel derives from it.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|python|curl|wget/i
const MAX_PAGES = 50
// A visit ends after 30 minutes of quiet, so one longer than this is a tab left open.
const MAX_VISIT_MS = 12 * 60 * 60 * 1000

// Per IP, in memory (reset on cold start), like the support chat's limit.
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 200
const recentRequests = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const times = (recentRequests.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  times.push(now)
  recentRequests.set(ip, times)
  if (recentRequests.size > 5000) recentRequests.clear()
  return times.length > RATE_LIMIT
}

const cleanPath = (value: unknown) =>
  typeof value === 'string' && value.startsWith('/') ? value.split(/[?#]/)[0]!.slice(0, 200) : null

const count = (value: unknown, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(Math.round(value), 0), max) : 0

function device(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(userAgent)) return 'tablet'
  if (/mobi|iphone|ipod|android/i.test(userAgent)) return 'mobile'
  return 'desktop'
}

export default defineEventHandler(async (event) => {
  const userAgent = getHeader(event, 'user-agent') ?? ''
  if (!userAgent || BOT.test(userAgent)) {
    setResponseStatus(event, 204)
    return null
  }
  if (rateLimited(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown')) {
    throw createError({ statusCode: 429, statusMessage: 'Too many visit updates.' })
  }

  // sendBeacon's body may arrive without a JSON content type, so parse it ourselves.
  const raw = await readRawBody(event)
  let body: Record<string, any>
  try {
    body = JSON.parse(raw ?? '')
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Expected a JSON visit.' })
  }
  const entryPath = cleanPath(body?.entryPath)
  if (!UUID.test(String(body?.id)) || !UUID.test(String(body?.visitorId)) || !entryPath) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid visit.' })
  }

  const now = Date.now()
  const startedAt = Math.min(Math.max(Date.parse(String(body.startedAt)) || now, now - MAX_VISIT_MS), now)
  // Time on the site can't be longer than the visit itself (a few seconds of slack for clocks).
  const maxSeconds = Math.ceil((now - startedAt) / 1000) + 30
  const pages = (Array.isArray(body.pages) ? body.pages : [])
    .map((p: any) => ({ path: cleanPath(p?.path), seconds: count(p?.seconds, maxSeconds) }))
    .filter((p: { path: string | null }) => p.path)
    .slice(0, MAX_PAGES)
  const referrer = typeof body.referrer === 'string' && /^[a-z0-9.-]{1,253}$/i.test(body.referrer) ? body.referrer.toLowerCase() : null

  const { error } = await useSupabaseAdmin()
    .from('site_visits')
    .upsert({
      id: body.id,
      visitor_id: body.visitorId,
      is_new: body.isNew === true,
      started_at: new Date(startedAt).toISOString(),
      last_seen_at: new Date(now).toISOString(),
      active_seconds: count(body.seconds, maxSeconds),
      page_views: count(body.pageViews, 10_000),
      pages,
      entry_path: entryPath,
      referrer,
      device: device(userAgent),
      country: getHeader(event, 'x-vercel-ip-country')?.slice(0, 2) || null
    })
  if (error) {
    console.error('Could not record a visit:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not record the visit.' })
  }
  setResponseStatus(event, 204)
  return null
})
