<script setup lang="ts">
// The admin dashboard's "agent machine": kidstory-api's five Claude agents drawn as
// one machine — what starts each agent, what it hands to the others, and where its
// work ends up. It stays still until an agent really runs: then that agent's gear
// turns and data flows along the wires it is using, from the moment the run starts
// until LINGER_MS after it ends, so even a 5-second run is easy to watch.
// Hovering an agent lights up its wiring. The visit tracker's wire flows whenever
// someone is on the site, since every visit is recorded without an agent run.
import type { AgentRun } from '../../shared/utils/kidstory-api'

const props = defineProps<{
  storyCount: number
  digestCount: number
  lastStoryAt: string | null
  lastDigestAt: string | null
  // Recent runs from GET /api/admin/agent-activity, newest first.
  runs: AgentRun[]
  // The current time in ms on the server's clock (the runs' timestamps are server-side).
  now: number
  // From GET /api/admin/visitors; null until loaded or when tracking isn't set up.
  visitors?: { total: number; avgVisitSeconds: number; liveNow: number } | null
}>()

type AgentId = 'story' | 'social' | 'books' | 'support' | 'visitors'

interface Agent {
  id: AgentId
  name: string
  role: string
  color: string
  // Darker shade of `color` for text on white.
  ink: string
  x: number
  y: number
  w: number
  // Card height, when it needs more room than CARD_H for its tools.
  h?: number
  tools: string[]
  about: string
}

const agents: Agent[] = [
  {
    id: 'story',
    name: 'Story agent',
    role: 'Writes every story',
    color: '#3E9B76',
    ink: '#2F6F58',
    x: 250,
    y: 30,
    w: 250,
    tools: ['catalog_overview · search_catalog', 'submit_story · decline_request'],
    about:
      'Looks at the stories in the database to find categories and ages that need stories, checks its idea isn’t a near-copy, then writes every field. submit_story checks the rules (length, title, tags) and sends problems back for it to fix. Once a story is published, it goes to the Social agent, which shares it and emails you a copy.'
  },
  {
    id: 'social',
    name: 'Social agent',
    role: 'Shares new work',
    color: '#E36656',
    ink: '#C2493A',
    x: 580,
    y: 140,
    w: 210,
    h: 154,
    tools: ['recent_posts · email_owner', 'post_to_facebook / instagram', 'post_to_youtube'],
    about:
      'Never starts on its own: the Story and Books agents hand it each new story or digest. It reads the last few posts so it doesn’t repeat itself, then writes a Facebook post and an Instagram caption. For a new story it also emails you a copy and uploads a short cover video to YouTube. The video needs ffmpeg, so YouTube only happens when the API runs on your machine, not on Vercel.'
  },
  {
    id: 'books',
    name: 'Books agent',
    role: 'Researches bestsellers',
    color: '#D9A441',
    ink: '#8A5F0E',
    x: 250,
    y: 250,
    w: 250,
    tools: ['web_search · recent_digests', 'publish_digest'],
    about:
      'Every evening it searches the web for children’s bestseller lists, picks an angle the last digests didn’t take, and writes the Book Picks digest. It can only cite pages its own searches found. The digest is saved to the database, where the website’s Book Picks section reads it, and handed to the Social agent.'
  },
  {
    id: 'support',
    name: 'Support agent',
    role: 'Helps readers',
    color: '#5BA3C9',
    ink: '#2B6F96',
    x: 250,
    y: 470,
    w: 250,
    tools: ['find_stories · story_details', 'hand_off_to_owner'],
    about:
      'Answers readers in the site’s chat bubble and recommends stories from the catalog. It can’t change anything; when something needs you, it hands the conversation off and you get an email.'
  },
  {
    id: 'visitors',
    name: 'Visitors agent',
    role: 'Watches who visits',
    color: '#8B6CC1',
    ink: '#5E4594',
    x: 250,
    y: 640,
    w: 250,
    tools: ['visitor_stats · compare_periods', 'story_titles'],
    about:
      'A tracker on every page records each visit in the database: an anonymous browser id, the pages read, and how long the reader was really there (tab open and active). Your own browser isn’t counted. The Visitors page shows the totals, and when you ask, this agent reads them and writes you a short report: how many came, how long they stayed, which stories hold readers, and what changed.'
  }
]

const CARD_H = 140

interface Node {
  x: number
  y: number
  w: number
  title: string
  sub: string
}

const triggers: Node[] = [
  { x: 10, y: 40, w: 170, title: 'Studio', sub: '/admin/studio' },
  { x: 10, y: 85, w: 170, title: 'Automate', sub: 'daily · 07:00 PKT' },
  { x: 10, y: 130, w: 170, title: 'Partner apps', sub: 'API · MCP' },
  { x: 10, y: 300, w: 170, title: 'Automate', sub: 'daily · 19:00 PKT' },
  { x: 10, y: 520, w: 170, title: 'Site visitors', sub: 'chat bubble' },
  { x: 10, y: 650, w: 170, title: 'Visit tracker', sub: 'every page view' },
  { x: 10, y: 720, w: 170, title: 'You · Visitors page', sub: '/admin/visitors' }
]

const outputs: (Node & { color: string })[] = [
  { x: 840, y: 130, w: 150, title: 'Facebook', sub: 'Page post', color: '#E36656' },
  { x: 840, y: 185, w: 150, title: 'Instagram', sub: '@kidstory64', color: '#E36656' },
  { x: 840, y: 240, w: 150, title: 'YouTube', sub: 'when run locally', color: '#C4302B' },
  // Book Picks is a section of the website, so the digest lands there too.
  { x: 840, y: 333, w: 150, title: 'Website', sub: 'stories · Book Picks', color: '#3E9B76' },
  { x: 840, y: 563, w: 150, title: 'Your inbox', sub: 'stories · hand-offs', color: '#5BA3C9' },
  { x: 840, y: 688, w: 150, title: 'Visitors page', sub: 'numbers · reports', color: '#8B6CC1' }
]

interface Wire {
  id: string
  d: string
  color: string
  agents: AgentId[]
  dashed?: boolean
  // Drawn over a white outline, so it reads as passing over a wire it crosses.
  halo?: boolean
  dur: number
}

const wires: Wire[] = [
  { id: 't-studio', d: 'M180,60 C215,60 215,75 250,75', color: '#3E9B76', agents: ['story'], dur: 2.2 },
  { id: 't-morning', d: 'M180,105 C215,105 215,100 250,100', color: '#3E9B76', agents: ['story'], dur: 2.6 },
  { id: 't-partner', d: 'M180,150 C215,150 215,125 250,125', color: '#3E9B76', agents: ['story'], dur: 3 },
  { id: 't-evening', d: 'M180,320 L250,320', color: '#D9A441', agents: ['books'], dur: 2.4 },
  { id: 't-readers', d: 'M180,540 L250,540', color: '#5BA3C9', agents: ['support'], dur: 2 },
  { id: 'story-social', d: 'M500,85 C540,85 540,190 580,190', color: '#3E9B76', agents: ['story', 'social'], dur: 2.4 },
  { id: 'books-social', d: 'M500,300 C540,300 540,240 580,240', color: '#D9A441', agents: ['books', 'social'], dur: 2.4 },
  { id: 'story-catalog', d: 'M500,150 C548,150 548,452 580,452', color: '#3E9B76', agents: ['story'], dur: 3.2 },
  { id: 'support-catalog', d: 'M500,505 C540,505 540,500 580,500', color: '#5BA3C9', agents: ['support'], dashed: true, dur: 1.8 },
  { id: 'social-fb', d: 'M790,180 C815,180 815,152 840,152', color: '#E36656', agents: ['social'], dur: 1.6 },
  { id: 'social-ig', d: 'M790,210 C815,210 815,207 840,207', color: '#E36656', agents: ['social'], dur: 1.6 },
  { id: 'social-youtube', d: 'M790,240 C815,240 815,262 840,262', color: '#E36656', agents: ['social'], dur: 1.6 },
  { id: 'social-inbox', d: 'M790,276 C830,276 814,575 840,575', color: '#E36656', agents: ['social'], dur: 2.8 },
  { id: 'books-catalog', d: 'M500,345 C538,345 538,474 580,474', color: '#D9A441', agents: ['books'], dur: 2.6 },
  // A Studio publish also renders a short cover video and uploads it (the daily cron doesn't).
  { id: 'catalog-site', d: 'M780,450 C812,450 812,365 840,365', color: '#1B3B5F', agents: ['story', 'books'], halo: true, dur: 1.6 },
  { id: 'support-inbox', d: 'M500,585 C670,585 670,585 840,585', color: '#5BA3C9', agents: ['support'], dur: 3 },
  { id: 't-tracker', d: 'M180,670 C215,670 215,682 250,682', color: '#8B6CC1', agents: ['visitors'], dur: 2 },
  { id: 't-owner', d: 'M180,740 C215,740 215,728 250,728', color: '#8B6CC1', agents: ['visitors'], dur: 2.2 },
  { id: 'visitors-catalog', d: 'M500,680 C700,680 740,600 740,520', color: '#8B6CC1', agents: ['visitors'], dashed: true, halo: true, dur: 2.2 },
  { id: 'visitors-page', d: 'M500,730 C670,730 670,710 840,710', color: '#8B6CC1', agents: ['visitors'], dur: 2.6 }
]

// Hover (or keyboard focus) previews an agent; a click pins it so the description stays.
const hovered = ref<AgentId | null>(null)
const pinned = ref<AgentId | null>(null)
const labels: { text: string; x: number; y: number; ink: string; agents: AgentId[] }[] = [
  { text: 'new story', x: 512, y: 70, ink: '#2F6F58', agents: ['story', 'social'] },
  { text: 'new digest', x: 506, y: 287, ink: '#8A5F0E', agents: ['books', 'social'] },
  { text: 'reads', x: 520, y: 530, ink: '#2B6F96', agents: ['support'] },
  { text: 'email', x: 800, y: 498, ink: '#C2493A', agents: ['social'] },
  { text: 'needs you', x: 640, y: 589, ink: '#2B6F96', agents: ['support'] },
  { text: 'visits', x: 548, y: 676, ink: '#5E4594', agents: ['visitors'] },
  { text: 'report', x: 700, y: 724, ink: '#5E4594', agents: ['visitors'] }
]

// --- live activity ---------------------------------------------------------

// How long an agent keeps moving after its run ends.
const LINGER_MS = 10_000
// A run still "running" after this was cut off (a serverless timeout) and never finished.
const STALE_MS = 5 * 60_000

const isLive = (run: AgentRun) => {
  const started = Date.parse(run.startedAt)
  if (run.status === 'running') return props.now - started < STALE_MS
  return props.now < Date.parse(run.finishedAt ?? run.startedAt) + LINGER_MS
}

const TRIGGER_WIRE: Record<string, string> = { studio: 't-studio', cron: 't-morning', partner: 't-partner', mcp: 't-partner' }
const PLATFORM_WIRE: Record<string, string> = { facebook: 'social-fb', instagram: 'social-ig', youtube: 'social-youtube', email: 'social-inbox' }

/** The wires a run is using. Outputs light up only once the run has really produced them. */
function wiresFor(run: AgentRun): string[] {
  const d = run.detail ?? {}
  switch (run.agent) {
    case 'story':
      if (run.action === 'publish') return ['story-catalog', 'catalog-site']
      return TRIGGER_WIRE[d.source] ? [TRIGGER_WIRE[d.source]] : []
    case 'social':
      return [d.kind === 'books' ? 'books-social' : 'story-social', ...((d.platforms as string[]) ?? []).map((p) => PLATFORM_WIRE[p]).filter(Boolean)]
    case 'books':
      return ['t-evening', ...(d.published ? ['books-catalog', 'catalog-site'] : [])]
    case 'support':
      return ['t-readers', 'support-catalog', ...(d.handoff ? ['support-inbox'] : [])]
    case 'visitors':
      return ['t-owner', 'visitors-catalog', 'visitors-page']
  }
  return []
}

const liveRuns = computed(() => props.runs.filter(isLive))
const liveWires = computed(() => new Set(liveRuns.value.flatMap(wiresFor)))
const working = computed(() => new Set(liveRuns.value.filter((r) => r.action === 'run').map((r) => r.agent)))
const busy = computed(() => liveWires.value.size > 0 || working.value.size > 0)
// Wires with data moving: the live runs', plus the tracker's while anyone is on the site.
const flowing = computed(() => (props.visitors?.liveNow ? new Set([...liveWires.value, 't-tracker']) : liveWires.value))

const SOURCE_LABEL: Record<string, string> = { studio: 'from the Studio', cron: 'on the morning cron', partner: 'for a partner app', mcp: 'over MCP' }
const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id

/** What a live run is doing, in a few words for the status line and the card. */
function describe(run: AgentRun): string {
  const d = run.detail ?? {}
  const verb = run.status === 'running' ? 'is' : run.status === 'failed' ? 'failed' : 'finished'
  if (run.action === 'publish') return `Story published${d.slug ? ` · ${d.slug}` : ''}`
  switch (run.agent) {
    case 'story':
      return run.status === 'running' ? `Story agent is writing ${SOURCE_LABEL[d.source] ?? ''}`.trim() : `Story agent ${verb} writing`
    case 'social':
      if (run.status === 'running') return `Social agent is sharing a ${d.kind === 'books' ? 'digest' : 'story'}`
      return d.platforms?.length ? `Social agent shared to ${d.platforms.join(', ')}` : `Social agent ${verb}`
    case 'books':
      return run.status === 'running' ? 'Books agent is researching bestsellers' : `Books agent ${verb}`
    case 'support':
      return run.status === 'running' ? 'Support agent is answering a reader' : d.handoff ? 'Support agent handed a chat to you' : 'Support agent answered a reader'
    case 'visitors':
      return run.status === 'running' ? 'Visitors agent is reading the numbers' : `Visitors agent ${verb === 'finished' ? 'wrote a report' : verb}`
  }
  return `${agentName(run.agent)} ${verb}`
}

const liveLines = computed(() => liveRuns.value.map(describe))
const lastRun = computed(() => props.runs[0] ?? null)
const ago = (iso: string) => {
  const s = Math.max(0, Math.round((props.now - Date.parse(iso)) / 1000))
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`
}

/** The card's bottom line while its agent is live. */
function liveStat(id: AgentId): string | null {
  const run = liveRuns.value.find((r) => r.agent === id && r.action === 'run')
  if (!run) return null
  return run.status === 'running' ? 'Working…' : run.status === 'failed' ? 'Run failed' : 'Done ✓'
}

const active = computed(() => hovered.value ?? pinned.value)
const togglePin = (id: AgentId) => (pinned.value = pinned.value === id ? null : id)
const selected = computed(() => agents.find((a) => a.id === active.value) ?? null)
const wireOpacity = (w: Wire) => {
  if (active.value) return w.agents.includes(active.value) ? 1 : 0.12
  // While something runs, the wires it isn't using step back.
  if (busy.value) return flowing.value.has(w.id) ? 1 : 0.3
  return 0.85
}
// An agent stays lit when it's wired to the highlighted one (e.g. Books → Social).
const linked = computed(() => new Set(wires.filter((w) => active.value && w.agents.includes(active.value)).flatMap((w) => w.agents)))
const cardOpacity = (id: AgentId) => (!active.value || linked.value.has(id) || active.value === id ? 1 : 0.45)

// Moving dots and spinning gears respect "reduce motion".
const animate = ref(false)
onMounted(() => {
  animate.value = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

const visitLength = (seconds: number) => `${Math.floor(seconds / 60)}m ${String(Math.round(seconds % 60)).padStart(2, '0')}s`
const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—')
const statLine = (id: AgentId) => {
  switch (id) {
    case 'story':
      return `Last story ${shortDate(props.lastStoryAt)} · ${props.storyCount} live`
    case 'books':
      return `Last digest ${shortDate(props.lastDigestAt)} · ${props.digestCount} total`
    case 'social':
      return 'Runs after every publish'
    case 'visitors':
      if (!props.visitors) return 'Reports when you ask'
      return `${props.visitors.total.toLocaleString()} visitors · avg ${visitLength(props.visitors.avgVisitSeconds)} a visit`
    default:
      return 'Answers on demand'
  }
}
</script>

<template>
  <section>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-heading text-2xl font-extrabold text-navy sm:text-3xl">Agent machine</h1>
        <p class="mt-1 text-sm text-ink-muted">Five Claude agents in kidstory-api and how work flows between them. Hover an agent to trace its wiring.</p>
      </div>
      <!-- Live status, top right. -->
      <p class="flex max-w-md flex-wrap items-center justify-end gap-2 text-right text-sm font-semibold sm:pt-2" aria-live="polite">
        <span class="relative flex h-2.5 w-2.5">
          <span v-if="busy" class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-60" />
          <span class="relative inline-flex h-2.5 w-2.5 rounded-full" :class="busy ? 'bg-green' : 'bg-[#D9D2C3]'" />
        </span>
        <template v-if="busy">
          <span v-for="(line, i) in liveLines" :key="i" class="rounded-full bg-white px-3 py-1 text-navy shadow">{{ line }}</span>
        </template>
        <span v-else class="text-ink-muted">
          Idle. The machine moves when an agent runs.
          <template v-if="lastRun"> Last: {{ describe(lastRun) }}, {{ ago(lastRun.finishedAt ?? lastRun.startedAt) }}.</template>
        </span>
      </p>
    </div>

    <div class="-mx-4 overflow-x-auto px-4 pb-2 pt-4 sm:mx-0 sm:px-0">
      <svg viewBox="0 0 1000 800" class="block w-full min-w-[760px]" role="img" aria-label="Diagram of the story, social, books, support and visitors agents and how they connect">
        <defs>
          <pattern id="am-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#1B3B5F" opacity="0.07" />
          </pattern>
          <path v-for="w in wires" :id="`am-${w.id}`" :key="w.id" :d="w.d" />
          <filter id="am-shadow" x="-15%" y="-20%" width="130%" height="150%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#1B3B5F" flood-opacity="0.12" />
          </filter>
          <filter id="am-shadow-lift" x="-15%" y="-20%" width="130%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#1B3B5F" flood-opacity="0.24" />
          </filter>
        </defs>
        <rect width="1000" height="800" fill="url(#am-grid)" />

        <!-- Column captions -->
        <g font-size="10" font-weight="700" letter-spacing="1.5" fill="#1B3B5F" opacity="0.65">
          <text x="10" y="22">TRIGGERS</text>
          <text x="250" y="22">AGENTS</text>
          <text x="840" y="140">WHERE IT LANDS</text>
        </g>

        <!-- Wires -->
        <g fill="none" stroke-linecap="round">
          <template v-for="w in wires" :key="w.id">
            <path v-if="w.halo" :d="w.d" stroke="#FBF3E3" stroke-width="9" />
            <path
              :d="w.d"
              :stroke="w.color"
              stroke-width="2.5"
              :stroke-dasharray="w.dashed ? '5 6' : undefined"
              :opacity="wireOpacity(w)"
              class="transition-opacity duration-300"
            />
          </template>
        </g>

        <!-- Data flowing along the wires a live run is using -->
        <g v-if="animate">
          <template v-for="w in wires.filter((w) => flowing.has(w.id))" :key="`dots-${w.id}`">
            <circle v-for="n in 2" :key="n" r="4.5" :fill="w.color">
              <animateMotion :dur="`${w.dur}s`" :begin="`${(n - 1) * (w.dur / 2)}s`" repeatCount="indefinite">
                <mpath :href="`#am-${w.id}`" />
              </animateMotion>
            </circle>
          </template>
        </g>

        <!-- Hand-off labels, on pills so they sit cleanly over crossing wires -->
        <g font-size="10.5" font-weight="700">
          <g v-for="l in labels" :key="l.text" :opacity="!active || l.agents.includes(active) ? 1 : 0.25" class="transition-opacity duration-300">
            <rect :x="l.x - 6" :y="l.y - 12" :width="l.text.length * 6 + 12" height="17" rx="8.5" fill="#FFFFFF" filter="url(#am-shadow)" />
            <text :x="l.x" :y="l.y" :fill="l.ink">{{ l.text }}</text>
          </g>
        </g>

        <!-- Triggers -->
        <g v-for="t in triggers" :key="t.y">
          <rect :x="t.x" :y="t.y" :width="t.w" height="40" rx="12" fill="#FFFFFF" filter="url(#am-shadow)" />
          <text :x="t.x + 12" :y="t.y + 17" font-size="12" font-weight="700" fill="#1B3B5F">{{ t.title }}</text>
          <text :x="t.x + 12" :y="t.y + 31" font-size="10" fill="#5B5347">{{ t.title === 'Visit tracker' && visitors?.liveNow ? `${visitors.liveNow} on the site now` : t.sub }}</text>
        </g>

        <!-- The shared database: stories and Book Picks digests -->
        <g :opacity="!active || active !== 'social' ? 1 : 0.45" class="transition-opacity duration-300">
          <rect x="580" y="430" width="200" height="90" rx="16" fill="#FFFFFF" filter="url(#am-shadow)" />
          <g transform="translate(606 458)" fill="none" stroke="#2F6F58" stroke-width="1.8">
            <ellipse cx="0" cy="0" rx="12" ry="4.5" />
            <path d="M-12,0 V18 A12,4.5 0 0 0 12,18 V0" />
            <path d="M-12,9 A12,4.5 0 0 0 12,9" />
          </g>
          <text x="628" y="459" font-size="13.5" font-weight="700" fill="#1B3B5F">Database</text>
          <text x="628" y="476" font-size="10.5" fill="#5B5347">{{ storyCount }} stories · {{ digestCount }} digests</text>
          <text v-if="visitors" x="628" y="490" font-size="10.5" fill="#5B5347">{{ visitors.total.toLocaleString() }} visitors tracked</text>
          <text x="628" y="505" font-size="10" fill="#5B5347" opacity="0.7">Supabase via kidstory-api</text>
        </g>

        <!-- Agents -->
        <g
          v-for="a in agents"
          :key="a.id"
          class="cursor-pointer transition-opacity duration-300"
          :opacity="cardOpacity(a.id)"
          tabindex="0"
          role="button"
          :aria-label="`${a.name}: ${a.role}`"
          @mouseenter="hovered = a.id"
          @mouseleave="hovered = null"
          @focus="hovered = a.id"
          @blur="hovered = null"
          @click="togglePin(a.id)"
          @keydown.enter="togglePin(a.id)"
        >
          <rect :x="a.x" :y="a.y" :width="a.w" :height="a.h ?? CARD_H" rx="18" fill="#FFFFFF" :filter="active === a.id || working.has(a.id) ? 'url(#am-shadow-lift)' : 'url(#am-shadow)'" />
          <rect :x="a.x" :y="a.y + 18" width="4" height="36" rx="2" :fill="a.color" />

          <!-- Gear -->
          <g :transform="`translate(${a.x + 32} ${a.y + 36})`">
            <circle r="17" :fill="a.color" />
            <g>
              <circle r="8.5" fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-dasharray="3.2 2.5" />
              <circle r="3" fill="#FFFFFF" />
              <animateTransform v-if="animate && working.has(a.id)" attributeName="transform" type="rotate" from="0" to="360" :dur="a.id === 'social' ? '4s' : '6s'" repeatCount="indefinite" />
            </g>
          </g>

          <text :x="a.x + 58" :y="a.y + 33" font-size="16" font-weight="800" fill="#1B3B5F" font-family="Fraunces, Georgia, serif">{{ a.name }}</text>
          <text :x="a.x + 58" :y="a.y + 50" font-size="11" fill="#5B5347">{{ a.role }}</text>

          <!-- Status light -->
          <circle :cx="a.x + a.w - 18" :cy="a.y + 20" r="5" :fill="working.has(a.id) ? a.color : '#D9D2C3'">
            <animate v-if="animate && working.has(a.id)" attributeName="opacity" values="1;0.35;1" dur="1.2s" repeatCount="indefinite" />
          </circle>

          <line :x1="a.x + 14" :x2="a.x + a.w - 14" :y1="a.y + 66" :y2="a.y + 66" stroke="#E9DAB8" />
          <text :x="a.x + 16" :y="a.y + 82" font-size="9" font-weight="700" letter-spacing="1.2" fill="#5B5347" opacity="0.7">TOOLS</text>
          <text
            v-for="(line, i) in a.tools"
            :key="i"
            :x="a.x + 16"
            :y="a.y + 97 + i * 14"
            font-size="10.5"
            font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill="#1B3B5F"
          >{{ line }}</text>
          <text :x="a.x + 16" :y="a.y + (a.h ?? CARD_H) - 10" font-size="10.5" font-weight="700" :fill="a.ink">{{ liveStat(a.id) ?? statLine(a.id) }}</text>
        </g>

        <!-- Outputs -->
        <g v-for="o in outputs" :key="o.title">
          <rect :x="o.x" :y="o.y" :width="o.w" height="44" rx="12" fill="#FFFFFF" filter="url(#am-shadow)" />
          <circle :cx="o.x + 16" :cy="o.y + 22" r="4" :fill="o.color" />
          <text :x="o.x + 28" :y="o.y + 19" font-size="12" font-weight="700" fill="#1B3B5F">{{ o.title }}</text>
          <text :x="o.x + 28" :y="o.y + 33" font-size="10" fill="#5B5347">{{ o.sub }}</text>
        </g>
      </svg>
    </div>

    <!-- What the highlighted agent does -->
    <div class="mt-2 pt-2">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="a in agents"
          :key="a.id"
          type="button"
          class="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold shadow transition-all"
          :class="pinned === a.id ? 'bg-navy text-cream shadow-md' : 'bg-white text-navy hover:shadow-md'"
          @click="togglePin(a.id)"
        >
          <span class="h-2 w-2 rounded-full" :style="{ background: a.color }" />
          {{ a.name }}
        </button>
      </div>
      <p class="mt-3 min-h-[3rem] text-sm leading-relaxed text-ink-muted">
        <template v-if="selected">{{ selected.about }}</template>
        <template v-else>
          Triggers on the left start an agent. The Story and Books agents hand finished work to the Social agent, which shares it.
          Stories and Book Picks digests are saved to the database, which the website and the Support agent read from. The Social agent shares each one, and emails you every new story.
          Every visit to the site is recorded there too, and the Visitors agent reads those numbers when you ask. Pick an agent to see what it does.
        </template>
      </p>
    </div>
  </section>
</template>
