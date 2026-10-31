<script setup lang="ts">
import { ZapOff } from '@lucide/vue'
import type { AgentRun, StorySummary, BookDigestList, VisitorStats } from '../../../shared/utils/kidstory-api'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Dashboard', robots: 'noindex, nofollow' })

const adminFetch = useAdminApi()

// What the agent machine shows on its cards: story count and last story,
// digest count and last digest, visitors and who's on the site now.
const stories = ref<StorySummary[]>([])
const digests = ref<BookDigestList | null>(null)
const visitors = ref<{ total: number; avgVisitSeconds: number; liveNow: number } | null>(null)
const error = ref('')

// Missing visitor numbers (tracking not set up yet) just leave the card's default line.
async function loadVisitors() {
  const stats = await adminFetch<VisitorStats>('/api/admin/visitors', { query: { days: 7 } }).catch(() => null)
  visitors.value = stats && { total: stats.allTime.visitors, avgVisitSeconds: stats.allTime.avgVisitSeconds, liveNow: stats.liveNow }
}

async function loadCounts() {
  try {
    const [list, digestList] = await Promise.all([
      adminFetch<StorySummary[]>('/api/admin/stories'),
      $fetch<BookDigestList>('/api/books').catch(() => null)
    ])
    stories.value = list
    digests.value = digestList
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Could not load the latest numbers.'
  }
}

// Live agent activity, polled often enough to catch a run that takes a few seconds.
const POLL_MS = 2000
const runs = ref<AgentRun[]>([])
const activityError = ref('')
// Server clock minus ours, so animations are timed against the runs' server timestamps.
const clockOffset = ref(0)
const now = ref(Date.now())
const seen = new Set<string>()

async function pollActivity() {
  if (document.visibilityState === 'hidden') return
  try {
    const res = await adminFetch<{ now: string; runs: AgentRun[] }>('/api/admin/agent-activity')
    clockOffset.value = Date.parse(res.now) - Date.now()
    activityError.value = ''
    // A new publish or digest changes the counts on the cards.
    const fresh = res.runs.filter((r) => !seen.has(`${r.id}:${r.status}`))
    if (seen.size && fresh.some((r) => r.action === 'publish' || (r.agent === 'books' && r.status === 'done'))) loadCounts()
    for (const r of res.runs) seen.add(`${r.id}:${r.status}`)
    runs.value = res.runs
  } catch (err: any) {
    activityError.value = err?.data?.statusMessage || err?.message || 'Live activity is unavailable.'
  }
}

let pollTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
let visitorsTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  loadCounts()
  loadVisitors()
  visitorsTimer = setInterval(() => document.visibilityState === 'visible' && loadVisitors(), 60_000)
  pollActivity()
  pollTimer = setInterval(pollActivity, POLL_MS)
  clockTimer = setInterval(() => (now.value = Date.now() + clockOffset.value), 250)
})
onBeforeUnmount(() => {
  clearInterval(pollTimer)
  clearInterval(clockTimer)
  clearInterval(visitorsTimer)
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
    <p v-if="error" class="mb-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">{{ error }}</p>
    <!-- Pinned top right (below the mobile top bar) so it never pushes the machine down. -->
    <div
      v-if="activityError"
      role="status"
      class="fixed right-4 top-28 z-40 flex max-w-xs gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-navy shadow-warm lg:top-6"
    >
      <ZapOff class="mt-0.5 h-4 w-4 shrink-0 text-coral" />
      <div>
        <p class="font-bold">Live activity is off</p>
        <p class="mt-0.5 text-ink-muted">{{ activityError }}</p>
      </div>
    </div>
    <AgentMachine
      :story-count="stories.length"
      :digest-count="digests?.total ?? 0"
      :last-story-at="stories[0]?.publishedAt ?? null"
      :last-digest-at="digests?.items[0]?.publishedAt ?? null"
      :runs="runs"
      :now="now"
      :visitors="visitors"
    />
  </div>
</template>
