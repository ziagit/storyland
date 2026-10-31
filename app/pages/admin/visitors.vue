<script setup lang="ts">
import { Users, Clock, Radio, MousePointerClick, Sparkles, Send, Loader2 } from '@lucide/vue'
import type { VisitorStats, VisitorsAgentResult } from '../../../shared/utils/kidstory-api'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Visitors', robots: 'noindex, nofollow' })

const adminFetch = useAdminApi()

// The visit tracker (app/plugins/visit-tracker.client.ts) records every visit;
// this page shows the totals and lets the owner ask the visitors agent about them.
const PERIODS = [7, 30, 90] as const
const days = ref<(typeof PERIODS)[number]>(30)
const stats = ref<VisitorStats | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = !stats.value
  try {
    stats.value = await adminFetch<VisitorStats>('/api/admin/visitors', { query: { days: days.value } })
    error.value = ''
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Could not load visitor numbers.'
  } finally {
    loading.value = false
  }
}

// "On the site now" stays fresh while the page is open.
const REFRESH_MS = 60_000
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  load()
  timer = setInterval(() => document.visibilityState === 'visible' && load(), REFRESH_MS)
})
onBeforeUnmount(() => clearInterval(timer))
watch(days, load)

const duration = (seconds: number) => {
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}
const number = (n: number) => n.toLocaleString()
const percent = (n: number) => `${Math.round(n * 100)}%`
const dayLabel = (date: string, opts: Intl.DateTimeFormatOptions) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, opts)

const period = computed(() => stats.value?.period ?? null)
const tiles = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { label: 'Total visitors', value: number(s.allTime.visitors), sub: `${number(s.allTime.visits)} visits all time`, icon: Users },
    { label: `Visitors · ${s.days} days`, value: number(s.period.visitors), sub: `${number(s.period.newVisitors)} new · ${number(s.period.returningVisitors)} returning`, icon: Users },
    { label: 'Avg time on site', value: duration(s.period.avgVisitSeconds), sub: `per visit · median ${duration(s.period.medianVisitSeconds)}`, icon: Clock },
    { label: 'Pages per visit', value: s.period.visits ? (s.period.pageViews / s.period.visits).toFixed(1) : '0', sub: `${percent(s.period.bounceRate)} left within 10s`, icon: MousePointerClick },
    { label: 'On the site now', value: number(s.liveNow), sub: 'active in the last 2 min', icon: Radio, live: s.liveNow > 0 }
  ]
})

// Daily visitors: one series, so bars in one hue with the title naming it.
const CHART_W = 720
const CHART_H = 180
const hovered = ref<number | null>(null)
const chart = computed(() => {
  const daily = period.value?.daily ?? []
  const max = Math.max(1, ...daily.map((d) => d.visitors))
  // A round top for the axis: 1, 2, 5 × 10ⁿ.
  const step = 10 ** Math.floor(Math.log10(max))
  const top = [1, 2, 5, 10].map((m) => m * step).find((v) => v >= max) ?? max
  const slot = CHART_W / Math.max(daily.length, 1)
  const gap = Math.max(2, slot * 0.2)
  return {
    top,
    bars: daily.map((d, i) => {
      const h = (d.visitors / top) * CHART_H
      return { ...d, x: i * slot + gap / 2, w: slot - gap, h, y: CHART_H - h, slotX: i * slot, slot }
    }),
    // Label a handful of days, never all 90.
    every: Math.ceil(daily.length / 8)
  }
})
const barPath = (b: { x: number; y: number; w: number; h: number }) => {
  if (b.h <= 0) return ''
  const r = Math.min(4, b.w / 2, b.h)
  return `M${b.x},${CHART_H} V${b.y + r} Q${b.x},${b.y} ${b.x + r},${b.y} H${b.x + b.w - r} Q${b.x + b.w},${b.y} ${b.x + b.w},${b.y + r} V${CHART_H} Z`
}

const maxPageVisits = computed(() => Math.max(1, ...(period.value?.topPages ?? []).map((p) => p.visits)))
const lists = computed(() =>
  period.value
    ? [
        { title: 'Where they came from', items: period.value.referrers.map((r) => ({ ...r, name: r.name === 'unknown' ? 'Direct / unknown' : r.name })) },
        { title: 'Devices', items: period.value.devices },
        { title: 'Countries', items: period.value.countries }
      ]
    : []
)

// --- the visitors agent ------------------------------------------------------
const question = ref('')
const asking = ref(false)
const report = ref<VisitorsAgentResult | null>(null)
const reportError = ref('')

async function askAgent() {
  asking.value = true
  reportError.value = ''
  try {
    report.value = await adminFetch<VisitorsAgentResult>('/api/admin/visitors/report', {
      method: 'POST',
      body: { days: days.value, question: question.value.trim() || undefined }
    })
  } catch (err: any) {
    reportError.value = err?.data?.statusMessage || err?.message || 'The visitors agent could not answer.'
  } finally {
    asking.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-3xl font-extrabold text-navy sm:text-4xl">Visitors</h1>
        <p class="mt-1 text-sm text-ink-muted">
          Who visits and how long they stay. Time counts only while a reader has the page open and is active; your own browser isn't counted.
        </p>
      </div>
      <div class="flex rounded-full bg-white p-1 shadow-warm" role="group" aria-label="Period">
        <button
          v-for="p in PERIODS"
          :key="p"
          type="button"
          class="rounded-full px-4 py-1.5 text-sm font-bold transition-colors"
          :class="days === p ? 'bg-green text-white' : 'text-navy hover:bg-tan/60'"
          :aria-pressed="days === p"
          @click="days = p"
        >
          {{ p }} days
        </button>
      </div>
    </div>

    <p v-if="error" class="mt-6 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">{{ error }}</p>

    <div v-if="loading" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div v-for="n in 5" :key="n" class="h-28 animate-pulse rounded-3xl bg-white/70" />
    </div>

    <template v-else-if="stats && period">
      <!-- Headline numbers -->
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div v-for="t in tiles" :key="t.label" class="rounded-3xl bg-white p-5 shadow-warm">
          <p class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted">
            <component :is="t.icon" class="h-3.5 w-3.5" />
            {{ t.label }}
            <span v-if="t.live" class="relative ml-auto flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-60" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-green" />
            </span>
          </p>
          <p class="mt-2 font-heading text-3xl font-extrabold text-navy">{{ t.value }}</p>
          <p class="mt-1 text-xs text-ink-muted">{{ t.sub }}</p>
        </div>
      </div>

      <!-- Visitors per day -->
      <section class="mt-6 rounded-3xl bg-white p-5 shadow-warm sm:p-6">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="font-heading text-lg font-bold text-navy">Visitors per day</h2>
          <p class="text-xs text-ink-muted" aria-live="polite">
            <template v-if="hovered !== null && chart.bars[hovered]">
              <span class="font-bold text-navy">{{ dayLabel(chart.bars[hovered]!.date, { weekday: 'short', month: 'short', day: 'numeric' }) }}</span>
              · {{ chart.bars[hovered]!.visitors }} visitors · {{ chart.bars[hovered]!.visits }} visits · avg {{ duration(chart.bars[hovered]!.avgVisitSeconds) }}
            </template>
            <template v-else>Hover a day for details · Pakistan time</template>
          </p>
        </div>
        <div class="mt-4 flex gap-2">
          <div class="flex w-8 shrink-0 flex-col justify-between pb-6 text-right text-[11px] text-ink-muted" aria-hidden="true">
            <span>{{ chart.top }}</span>
            <span>{{ chart.top / 2 }}</span>
            <span>0</span>
          </div>
          <div class="min-w-0 flex-1">
            <svg :viewBox="`0 0 ${CHART_W} ${CHART_H + 24}`" class="block w-full" preserveAspectRatio="none" role="img" :aria-label="`Visitors per day over the last ${stats.days} days`" @mouseleave="hovered = null">
              <line v-for="f in [0, 0.5, 1]" :key="f" x1="0" :x2="CHART_W" :y1="CHART_H * f" :y2="CHART_H * f" stroke="#E9DAB8" stroke-width="1" vector-effect="non-scaling-stroke" />
              <g v-for="(b, i) in chart.bars" :key="b.date">
                <path :d="barPath(b)" :fill="hovered === i ? '#2F6F58' : '#3E9B76'" />
                <!-- The hit target is the whole column, not just the bar. -->
                <rect :x="b.slotX" y="0" :width="b.slot" :height="CHART_H" fill="transparent" @mouseenter="hovered = i" @click="hovered = i" />
              </g>
            </svg>
            <div class="relative -mt-5 h-5 text-[11px] text-ink-muted" aria-hidden="true">
              <template v-for="(b, i) in chart.bars" :key="b.date">
                <span v-if="i % chart.every === 0" class="absolute -translate-x-1/2 whitespace-nowrap" :style="{ left: `${((b.slotX + b.slot / 2) / CHART_W) * 100}%` }">
                  {{ dayLabel(b.date, { month: 'short', day: 'numeric' }) }}
                </span>
              </template>
            </div>
          </div>
        </div>
        <details class="mt-3 text-sm">
          <summary class="cursor-pointer text-xs font-bold text-green">Show as a table</summary>
          <table class="mt-2 w-full text-left text-xs">
            <thead class="text-ink-muted"><tr><th class="py-1">Day</th><th>Visitors</th><th>Visits</th><th>Avg time</th></tr></thead>
            <tbody>
              <tr v-for="d in [...period.daily].reverse()" :key="d.date" class="border-t border-tan/50 text-navy">
                <td class="py-1">{{ dayLabel(d.date, { weekday: 'short', month: 'short', day: 'numeric' }) }}</td>
                <td>{{ d.visitors }}</td>
                <td>{{ d.visits }}</td>
                <td>{{ duration(d.avgVisitSeconds) }}</td>
              </tr>
            </tbody>
          </table>
        </details>
      </section>

      <div class="mt-6 grid gap-6 lg:grid-cols-5">
        <!-- Top pages -->
        <section class="rounded-3xl bg-white p-5 shadow-warm sm:p-6 lg:col-span-3">
          <h2 class="font-heading text-lg font-bold text-navy">Most visited pages</h2>
          <p class="text-xs text-ink-muted">Visits that opened the page, and the average time spent on it.</p>
          <table v-if="period.topPages.length" class="mt-4 w-full text-left text-sm">
            <thead class="text-xs text-ink-muted">
              <tr><th class="pb-2 font-semibold">Page</th><th class="pb-2 text-right font-semibold">Visits</th><th class="pb-2 text-right font-semibold">Avg time</th></tr>
            </thead>
            <tbody>
              <tr v-for="p in period.topPages" :key="p.path" class="border-t border-tan/50">
                <td class="max-w-0 py-2 pr-3">
                  <NuxtLink :to="p.path" target="_blank" class="block truncate font-semibold text-navy hover:text-green" :title="p.path">{{ p.path }}</NuxtLink>
                  <div class="mt-1 h-1 rounded-full bg-cream">
                    <div class="h-1 rounded-full bg-[#3E9B76]" :style="{ width: `${(p.visits / maxPageVisits) * 100}%` }" />
                  </div>
                </td>
                <td class="py-2 text-right font-bold text-navy">{{ number(p.visits) }}</td>
                <td class="py-2 pl-3 text-right text-ink-muted">{{ duration(p.avgSeconds) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="mt-4 text-sm text-ink-muted">No visits in this period yet.</p>
        </section>

        <!-- Referrers, devices, countries -->
        <section class="space-y-5 rounded-3xl bg-white p-5 shadow-warm sm:p-6 lg:col-span-2">
          <div v-for="l in lists" :key="l.title">
            <h2 class="text-xs font-bold uppercase tracking-wide text-ink-muted">{{ l.title }}</h2>
            <ul v-if="l.items.length" class="mt-2 space-y-1.5 text-sm">
              <li v-for="item in l.items.slice(0, 5)" :key="item.name" class="flex justify-between gap-3">
                <span class="truncate capitalize text-navy">{{ item.name }}</span>
                <span class="shrink-0 font-bold text-navy">{{ percent(item.visits / Math.max(period.visits, 1)) }}</span>
              </li>
            </ul>
            <p v-else class="mt-2 text-sm text-ink-muted">—</p>
          </div>
        </section>
      </div>
    </template>

    <!-- The visitors agent -->
    <section class="mt-6 rounded-3xl bg-white p-5 shadow-warm sm:p-6">
      <div class="flex items-center gap-2">
        <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B6CC1] text-white"><Sparkles class="h-4 w-4" /></span>
        <div>
          <h2 class="font-heading text-lg font-bold text-navy">Ask the visitors agent</h2>
          <p class="text-xs text-ink-muted">It reads these numbers for the last {{ days }} days and writes you a short report, or answers your question.</p>
        </div>
      </div>
      <form class="mt-4 flex flex-col gap-2 sm:flex-row" @submit.prevent="askAgent">
        <input
          v-model="question"
          type="text"
          maxlength="500"
          placeholder="Optional: e.g. Which stories keep readers longest?"
          class="min-w-0 flex-1 rounded-2xl border border-tan bg-cream/50 px-4 py-2.5 text-sm text-navy placeholder:text-ink-muted/70 focus:border-green focus:outline-none"
        />
        <button type="submit" :disabled="asking" class="flex items-center justify-center gap-2 rounded-2xl bg-green px-5 py-2.5 text-sm font-bold text-white shadow-warm hover:bg-[#245946] disabled:opacity-60">
          <Loader2 v-if="asking" class="h-4 w-4 animate-spin" />
          <Send v-else class="h-4 w-4" />
          {{ asking ? 'Reading the numbers…' : question.trim() ? 'Ask' : 'Write a report' }}
        </button>
      </form>
      <p v-if="reportError" class="mt-3 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">{{ reportError }}</p>
      <div v-if="report" class="mt-4 rounded-2xl bg-cream/60 p-4">
        <p class="whitespace-pre-line text-sm leading-relaxed text-navy">{{ report.report }}</p>
        <p class="mt-3 text-[11px] text-ink-muted">
          Looked at: <span v-for="(s, i) in report.steps" :key="i">{{ i ? ' · ' : '' }}{{ s.detail }}</span>
        </p>
      </div>
    </section>
  </div>
</template>
