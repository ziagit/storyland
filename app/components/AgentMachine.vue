<script setup lang="ts">
// The admin dashboard's "agent machine": kidstory-api's four Claude agents drawn as
// one machine — what starts each agent, what it hands to the others, and where its
// work ends up. Data flows as moving dots; hovering an agent lights up its wiring.
const props = defineProps<{
  storyCount: number
  digestCount: number
  lastStoryAt: string | null
  lastDigestAt: string | null
}>()

type AgentId = 'story' | 'social' | 'books' | 'support'

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
      'Looks at the stories in the database to find categories and ages that need stories, checks its idea isn’t a near-copy, then writes every field. submit_story checks the rules (length, title, tags) and sends problems back for it to fix. Once a story is published, a copy is emailed to you and the story goes to the Social agent. Stories published from the Studio are also uploaded to YouTube as a short video.'
  },
  {
    id: 'social',
    name: 'Social agent',
    role: 'Shares new work',
    color: '#E36656',
    ink: '#C2493A',
    x: 580,
    y: 140,
    w: 200,
    tools: ['recent_posts', 'post_to_facebook / instagram'],
    about:
      'Never starts on its own: the Story and Books agents hand it each new story or digest. It reads the last few posts so it doesn’t repeat itself, then writes a post for Facebook and a caption for Instagram.'
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
  { x: 10, y: 40, w: 170, title: 'You · Studio chat', sub: '/admin/studio' },
  { x: 10, y: 85, w: 170, title: 'Morning cron', sub: 'daily · 07:00 PKT' },
  { x: 10, y: 130, w: 170, title: 'Partner apps', sub: 'API · MCP' },
  { x: 10, y: 300, w: 170, title: 'Evening cron', sub: 'daily · 19:00 PKT' },
  { x: 10, y: 520, w: 170, title: 'Site visitors', sub: 'chat bubble' }
]

const outputs: (Node & { color: string })[] = [
  { x: 840, y: 153, w: 150, title: 'Facebook', sub: 'Page post', color: '#E36656' },
  { x: 840, y: 218, w: 150, title: 'Instagram', sub: '@kidstory64', color: '#E36656' },
  // Book Picks is a section of the website, so the digest lands there too.
  { x: 840, y: 333, w: 150, title: 'Website', sub: 'stories · Book Picks', color: '#3E9B76' },
  { x: 840, y: 420, w: 150, title: 'YouTube', sub: 'Studio publishes', color: '#C4302B' },
  { x: 840, y: 563, w: 150, title: 'Your inbox', sub: 'stories · hand-offs', color: '#5BA3C9' }
]

interface Wire {
  id: string
  d: string
  color: string
  agents: AgentId[]
  dashed?: boolean
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
  { id: 'social-fb', d: 'M780,190 C810,190 810,175 840,175', color: '#E36656', agents: ['social'], dur: 1.6 },
  { id: 'social-ig', d: 'M780,235 C810,235 810,240 840,240', color: '#E36656', agents: ['social'], dur: 1.6 },
  { id: 'books-catalog', d: 'M500,345 C538,345 538,474 580,474', color: '#D9A441', agents: ['books'], dur: 2.6 },
  // A Studio publish also renders a short cover video and uploads it (the daily cron doesn't).
  { id: 'catalog-youtube', d: 'M780,472 C810,472 810,442 840,442', color: '#3E9B76', agents: ['story'], dur: 1.8 },
  { id: 'catalog-site', d: 'M780,450 C812,450 812,365 840,365', color: '#1B3B5F', agents: ['story', 'books'], dur: 1.6 },
  { id: 'catalog-inbox', d: 'M780,505 C812,505 812,574 840,574', color: '#3E9B76', agents: ['story'], dur: 1.8 },
  { id: 'support-inbox', d: 'M500,585 C670,585 670,585 840,585', color: '#5BA3C9', agents: ['support'], dur: 3 }
]

// Hover (or keyboard focus) previews an agent; a click pins it so the description stays.
const hovered = ref<AgentId | null>(null)
const pinned = ref<AgentId | null>(null)
const labels: { text: string; x: number; y: number; ink: string; agents: AgentId[] }[] = [
  { text: 'new story', x: 512, y: 70, ink: '#2F6F58', agents: ['story', 'social'] },
  { text: 'new digest', x: 506, y: 287, ink: '#8A5F0E', agents: ['books', 'social'] },
  { text: 'reads', x: 520, y: 530, ink: '#2B6F96', agents: ['support'] },
  { text: 'email', x: 792, y: 546, ink: '#2F6F58', agents: ['story'] },
  { text: 'needs you', x: 640, y: 589, ink: '#2B6F96', agents: ['support'] }
]

const active = computed(() => hovered.value ?? pinned.value)
const togglePin = (id: AgentId) => (pinned.value = pinned.value === id ? null : id)
const selected = computed(() => agents.find((a) => a.id === active.value) ?? null)
const wireOpacity = (w: Wire) => (!active.value ? 0.85 : w.agents.includes(active.value) ? 1 : 0.12)
// An agent stays lit when it's wired to the highlighted one (e.g. Books → Social).
const linked = computed(() => new Set(wires.filter((w) => active.value && w.agents.includes(active.value)).flatMap((w) => w.agents)))
const cardOpacity = (id: AgentId) => (!active.value || linked.value.has(id) || active.value === id ? 1 : 0.45)

// Moving dots and spinning gears respect "reduce motion".
const animate = ref(false)
onMounted(() => {
  animate.value = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—')
const statLine = (id: AgentId) => {
  switch (id) {
    case 'story':
      return `Last story ${shortDate(props.lastStoryAt)} · ${props.storyCount} live`
    case 'books':
      return `Last digest ${shortDate(props.lastDigestAt)} · ${props.digestCount} total`
    case 'social':
      return 'Runs after every publish'
    default:
      return 'Answers on demand'
  }
}
</script>

<template>
  <section>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-heading text-2xl font-extrabold text-navy sm:text-3xl">Agent machine</h1>
        <p class="mt-1 text-sm text-ink-muted">Four Claude agents in kidstory-api and how work flows between them. Hover an agent to trace its wiring.</p>
      </div>
      <div class="flex flex-wrap gap-3 text-xs font-semibold text-ink-muted">
        <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-white shadow" /> Triggers</span>
        <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-white shadow-md" /> Agents</span>
        <span class="flex items-center gap-1.5"><span class="h-0 w-4 border-t-2 border-dashed border-navy/40" /> Reads</span>
      </div>
    </div>

    <div class="-mx-4 overflow-x-auto px-4 pb-2 pt-4 sm:mx-0 sm:px-0">
      <svg viewBox="0 0 1000 630" class="block w-full min-w-[760px]" role="img" aria-label="Diagram of the story, social, books and support agents and how they connect">
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
        <rect width="1000" height="630" fill="url(#am-grid)" />

        <!-- Column captions -->
        <g font-size="10" font-weight="700" letter-spacing="1.5" fill="#1B3B5F" opacity="0.65">
          <text x="10" y="22">TRIGGERS</text>
          <text x="250" y="22">AGENTS</text>
          <text x="840" y="140">WHERE IT LANDS</text>
        </g>

        <!-- Wires -->
        <g fill="none" stroke-linecap="round">
          <path
            v-for="w in wires"
            :key="w.id"
            :d="w.d"
            :stroke="w.color"
            stroke-width="2.5"
            :stroke-dasharray="w.dashed ? '5 6' : undefined"
            :opacity="wireOpacity(w)"
            class="transition-opacity duration-300"
          />
        </g>

        <!-- Data flowing along the wires -->
        <g v-if="animate">
          <template v-for="w in wires" :key="`dots-${w.id}`">
            <circle v-for="n in 2" :key="n" r="4" :fill="w.color" :opacity="wireOpacity(w) > 0.2 ? 1 : 0.15">
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
        <g v-for="t in triggers" :key="t.title">
          <rect :x="t.x" :y="t.y" :width="t.w" height="40" rx="12" fill="#FFFFFF" filter="url(#am-shadow)" />
          <text :x="t.x + 12" :y="t.y + 17" font-size="12" font-weight="700" fill="#1B3B5F">{{ t.title }}</text>
          <text :x="t.x + 12" :y="t.y + 31" font-size="10" fill="#5B5347">{{ t.sub }}</text>
        </g>

        <!-- The shared database: stories and Book Picks digests -->
        <g :opacity="!active || active === 'story' || active === 'books' || active === 'support' ? 1 : 0.45" class="transition-opacity duration-300">
          <rect x="580" y="430" width="200" height="90" rx="16" fill="#FFFFFF" filter="url(#am-shadow)" />
          <g transform="translate(606 458)" fill="none" stroke="#2F6F58" stroke-width="1.8">
            <ellipse cx="0" cy="0" rx="12" ry="4.5" />
            <path d="M-12,0 V18 A12,4.5 0 0 0 12,18 V0" />
            <path d="M-12,9 A12,4.5 0 0 0 12,9" />
          </g>
          <text x="628" y="459" font-size="13.5" font-weight="700" fill="#1B3B5F">Database</text>
          <text x="628" y="476" font-size="10.5" fill="#5B5347">{{ storyCount }} stories · {{ digestCount }} digests</text>
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
          <rect :x="a.x" :y="a.y" :width="a.w" :height="CARD_H" rx="18" fill="#FFFFFF" :filter="active === a.id ? 'url(#am-shadow-lift)' : 'url(#am-shadow)'" />
          <rect :x="a.x" :y="a.y + 18" width="4" height="36" rx="2" :fill="a.color" />

          <!-- Gear -->
          <g :transform="`translate(${a.x + 32} ${a.y + 36})`">
            <circle r="17" :fill="a.color" />
            <g>
              <circle r="8.5" fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-dasharray="3.2 2.5" />
              <circle r="3" fill="#FFFFFF" />
              <animateTransform v-if="animate" attributeName="transform" type="rotate" from="0" to="360" :dur="a.id === 'social' ? '4s' : '6s'" repeatCount="indefinite" />
            </g>
          </g>

          <text :x="a.x + 58" :y="a.y + 33" font-size="16" font-weight="800" fill="#1B3B5F" font-family="Fraunces, Georgia, serif">{{ a.name }}</text>
          <text :x="a.x + 58" :y="a.y + 50" font-size="11" fill="#5B5347">{{ a.role }}</text>

          <!-- Status light -->
          <circle :cx="a.x + a.w - 18" :cy="a.y + 20" r="5" :fill="a.color">
            <animate v-if="animate" attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
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
          <text :x="a.x + 16" :y="a.y + CARD_H - 10" font-size="10.5" font-weight="700" :fill="a.ink">{{ statLine(a.id) }}</text>
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
          Stories and Book Picks digests are saved to the database, which the website and the Support agent read from. Every new story is also emailed to you. Pick an agent to see what it does.
        </template>
      </p>
    </div>
  </section>
</template>
