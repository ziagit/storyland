<script setup lang="ts">
import type { AgentRun, StorySummary, BookDigestList } from '../../../shared/utils/kidstory-api'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Dashboard', robots: 'noindex, nofollow' })

const adminFetch = useAdminApi()

// What the agent machine shows on its cards: story count and last story,
// digest count and last digest.
const stories = ref<StorySummary[]>([])
const digests = ref<BookDigestList | null>(null)
const error = ref('')

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
onMounted(() => {
  loadCounts()
  pollActivity()
  pollTimer = setInterval(pollActivity, POLL_MS)
  clockTimer = setInterval(() => (now.value = Date.now() + clockOffset.value), 250)
})
onBeforeUnmount(() => {
  clearInterval(pollTimer)
  clearInterval(clockTimer)
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
    <p v-if="error" class="mb-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">{{ error }}</p>
    <p v-if="activityError" class="mb-4 rounded-2xl bg-tan/60 px-4 py-3 text-sm font-semibold text-navy">
      Live activity is off: {{ activityError }}
    </p>
    <AgentMachine
      :story-count="stories.length"
      :digest-count="digests?.total ?? 0"
      :last-story-at="stories[0]?.publishedAt ?? null"
      :last-digest-at="digests?.items[0]?.publishedAt ?? null"
      :runs="runs"
      :now="now"
    />
  </div>
</template>
