// Counts visitors and how long they stay, for the visitors agent (/admin/visitors).
// A visitor is this browser: a random id in localStorage, nothing else. A visit
// ends after 30 minutes without activity and is shared by the browser's tabs.
// Only time the tab is visible, with some reader activity in the last 10 minutes,
// counts as time on the site, so a forgotten tab doesn't run up the clock.
// The whole visit goes to POST /api/visits every 30 s while it grows, on every
// page change and when the tab is hidden or closed.
// The owner's browser is left out from its first visit to /admin or /login on.

const VISITOR_KEY = 'kidstory-visitor'
const VISIT_KEY = 'kidstory-visit'
const OPT_OUT_KEY = 'kidstory-no-track'
const VISIT_TIMEOUT_MS = 30 * 60_000
const IDLE_MS = 10 * 60_000
const TICK_MS = 5_000
const SEND_EVERY_MS = 30_000
const MAX_PAGES = 50

interface Visit {
  id: string
  isNew: boolean
  startedAt: number
  lastActiveAt: number
  seconds: number
  pageViews: number
  pages: { path: string; seconds: number }[]
  entryPath: string
  referrer: string | null
}

const isOwnerPath = (path: string) => path.startsWith('/admin') || path === '/login'

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function read<T>(key: string): T | null {
  try {
    const raw = storage()?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    storage()?.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or full storage: this tab still counts on its own.
  }
}

// Only the host of an outside page that linked here; same-site navigation isn't a referrer.
function referrerHost(): string | null {
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : ''
    return host && host !== location.hostname ? host : null
  } catch {
    return null
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  if (navigator.webdriver) return

  let visitorId = read<string>(VISITOR_KEY)
  const returning = Boolean(visitorId)
  if (!visitorId) {
    visitorId = crypto.randomUUID()
    write(VISITOR_KEY, visitorId)
  }

  let path = router.currentRoute.value.path
  let lastInteraction = Date.now()
  let lastTick = Date.now()
  let lastSent = 0
  let dirty = false
  // Kept in memory too, so a tab without localStorage still has its visit.
  let current: Visit | null = null

  const optedOut = () => {
    if (isOwnerPath(path)) write(OPT_OUT_KEY, true)
    return Boolean(read<boolean>(OPT_OUT_KEY))
  }

  /** The visit in progress (another tab's included), or a new one once the last went quiet. */
  function visit(now: number): Visit {
    const stored = read<Visit>(VISIT_KEY) ?? current
    if (stored && now - stored.lastActiveAt < VISIT_TIMEOUT_MS) return (current = stored)
    current = {
      id: crypto.randomUUID(),
      // Only the browser's first visit is new; later visits come from a returning visitor.
      isNew: !returning && !stored,
      startedAt: now,
      lastActiveAt: now,
      seconds: 0,
      pageViews: 0,
      pages: [],
      entryPath: path,
      referrer: referrerHost()
    }
    return current
  }

  function save(v: Visit) {
    current = v
    write(VISIT_KEY, v)
    dirty = true
  }

  function send(force = false) {
    const now = Date.now()
    if (!current || !dirty || (!force && now - lastSent < SEND_EVERY_MS)) return
    const body = JSON.stringify({
      id: current.id,
      visitorId,
      isNew: current.isNew,
      startedAt: new Date(current.startedAt).toISOString(),
      seconds: Math.round(current.seconds),
      pageViews: current.pageViews,
      pages: current.pages.map((p) => ({ path: p.path, seconds: Math.round(p.seconds) })),
      entryPath: current.entryPath,
      referrer: current.referrer
    })
    lastSent = now
    dirty = false
    // sendBeacon survives the tab closing; fetch with keepalive is the fallback.
    const blob = new Blob([body], { type: 'application/json' })
    if (!navigator.sendBeacon?.('/api/visits', blob)) {
      fetch('/api/visits', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
    }
  }

  /** Adds the time since the last tick, if the reader was really here for it. */
  function tick() {
    const now = Date.now()
    const elapsed = Math.min(now - lastTick, TICK_MS * 2)
    lastTick = now
    if (optedOut() || document.visibilityState !== 'visible' || now - lastInteraction > IDLE_MS) return
    const v = visit(now)
    v.seconds += elapsed / 1000
    v.lastActiveAt = now
    const page = v.pages.find((p) => p.path === path)
    if (page) page.seconds += elapsed / 1000
    save(v)
    send()
  }

  function pageView(to: string) {
    path = to
    if (optedOut()) return
    const now = Date.now()
    const v = visit(now)
    v.pageViews += 1
    v.lastActiveAt = now
    if (!v.pages.some((p) => p.path === to) && v.pages.length < MAX_PAGES) v.pages.push({ path: to, seconds: 0 })
    save(v)
    send(true)
  }

  const interacted = () => (lastInteraction = Date.now())
  for (const type of ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove']) {
    window.addEventListener(type, interacted, { passive: true })
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      tick()
      send(true)
    } else {
      lastTick = Date.now()
      interacted()
    }
  })
  window.addEventListener('pagehide', () => send(true))

  nuxtApp.hook('app:mounted', () => pageView(router.currentRoute.value.path))
  router.afterEach((to, from) => {
    // The first navigation (from nowhere) is the landing page, counted on mount.
    if (to.path === from.path || !from.matched.length) return
    tick()
    pageView(to.path)
  })
  setInterval(tick, TICK_MS)
})
