<script setup lang="ts">
import { BookOpen, CalendarDays, Library, ImageOff, Wand2, ArrowRight, Loader2, Pencil } from '@lucide/vue'
import { categories } from '~/data/categories'
import type { StorySummary, BookDigestList } from '../../../shared/utils/kidstory-api'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Dashboard', robots: 'noindex, nofollow' })

const adminFetch = useAdminApi()
const { user } = useAuth()

const stories = ref<StorySummary[]>([])
const digestTotal = ref(0)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [list, digests] = await Promise.all([
      adminFetch<StorySummary[]>('/api/admin/stories'),
      $fetch<BookDigestList>('/api/books').catch(() => null)
    ])
    stories.value = list
    digestTotal.value = digests?.total ?? 0
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Could not load the dashboard.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
const thisWeek = computed(() => stories.value.filter((s) => new Date(s.publishedAt).getTime() >= weekAgo).length)
const missingCovers = computed(() => stories.value.filter((s) => !s.coverImageUrl).length)
const recent = computed(() => stories.value.slice(0, 6))

const byCategory = computed(() => {
  const counts = categories.map((c) => ({ ...c, count: stories.value.filter((s) => s.category === c.slug).length }))
  const max = Math.max(1, ...counts.map((c) => c.count))
  return counts.map((c) => ({ ...c, pct: Math.round((c.count / max) * 100) }))
})

const stats = computed(() => [
  { label: 'Stories', value: stories.value.length, icon: BookOpen, tint: 'bg-green/15 text-green' },
  { label: 'Published this week', value: thisWeek.value, icon: CalendarDays, tint: 'bg-coral/15 text-coral' },
  { label: 'Book Picks digests', value: digestTotal.value, icon: Library, tint: 'bg-navy/10 text-navy' },
  { label: 'Missing covers', value: missingCovers.value, icon: ImageOff, tint: 'bg-tan text-navy' }
])

const categoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
})

const backfilling = ref(false)
const backfillMessage = ref('')
async function backfillCovers() {
  backfilling.value = true
  backfillMessage.value = ''
  try {
    const res = await adminFetch<{ backfilled: number }>('/api/admin/backfill-covers', { method: 'POST' })
    backfillMessage.value = res.backfilled ? `Added covers to ${res.backfilled} ${res.backfilled === 1 ? 'story' : 'stories'}.` : 'Every story already has a cover.'
    await load()
  } catch (err: any) {
    backfillMessage.value = err?.data?.statusMessage || 'Could not fill in covers.'
  } finally {
    backfilling.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-bold text-green">{{ greeting }}</p>
        <h1 class="font-heading text-3xl font-extrabold text-navy sm:text-4xl">Dashboard</h1>
        <p v-if="user" class="mt-1 text-sm text-ink-muted">Signed in as {{ user.email }}</p>
      </div>
      <UiButton to="/admin/studio" variant="primary">
        <Wand2 class="h-4 w-4" /> Write a story
      </UiButton>
    </div>

    <p v-if="error" class="mt-6 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">{{ error }}</p>

    <!-- Stats -->
    <div class="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="rounded-3xl bg-white p-5 shadow-warm">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl" :class="stat.tint">
          <component :is="stat.icon" class="h-5 w-5" />
        </div>
        <p class="mt-4 font-heading text-3xl font-extrabold text-navy">
          <span v-if="loading" class="inline-block h-8 w-12 animate-pulse rounded-lg bg-tan/60 align-middle" />
          <template v-else>{{ stat.value }}</template>
        </p>
        <p class="text-sm font-semibold text-ink-muted">{{ stat.label }}</p>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <!-- Recent stories -->
      <section class="rounded-3xl bg-white p-6 shadow-warm">
        <div class="flex items-center justify-between">
          <h2 class="font-heading text-xl font-bold text-navy">Latest stories</h2>
          <NuxtLink to="/admin/stories" class="flex items-center gap-1 text-sm font-bold text-green hover:text-coral">
            All stories <ArrowRight class="h-4 w-4" />
          </NuxtLink>
        </div>
        <div v-if="loading" class="mt-4 space-y-3">
          <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-2xl bg-tan/40" />
        </div>
        <ul v-else class="mt-4 divide-y divide-tan/60">
          <li v-for="story in recent" :key="story.slug" class="flex items-center gap-4 py-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream text-2xl">{{ story.emoji }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-bold text-navy">{{ story.title }}</p>
              <p class="text-xs text-ink-muted">{{ categoryLabel(story.category) }} · {{ formatDate(story.publishedAt) }}</p>
            </div>
            <NuxtLink
              :to="`/admin/stories/${story.slug}`"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-navy hover:bg-tan"
              :aria-label="`Edit ${story.title}`"
            >
              <Pencil class="h-4 w-4" />
            </NuxtLink>
          </li>
          <li v-if="!recent.length" class="py-6 text-center text-sm text-ink-muted">No stories yet.</li>
        </ul>
      </section>

      <div class="space-y-6">
        <!-- Category mix -->
        <section class="rounded-3xl bg-white p-6 shadow-warm">
          <h2 class="font-heading text-xl font-bold text-navy">By category</h2>
          <ul class="mt-4 space-y-3">
            <li v-for="cat in byCategory" :key="cat.slug">
              <div class="flex items-center justify-between text-sm">
                <span class="flex items-center gap-2 font-semibold text-navy">
                  <component :is="cat.icon" class="h-4 w-4 text-green" /> {{ cat.label }}
                </span>
                <span class="font-bold text-ink-muted">{{ loading ? "–" : cat.count }}</span>
              </div>
              <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-cream">
                <div class="h-full rounded-full bg-green transition-all duration-500" :style="{ width: `${loading ? 0 : cat.pct}%` }" />
              </div>
            </li>
          </ul>
        </section>

        <!-- Tools -->
        <section class="rounded-3xl bg-navy p-6 text-cream shadow-warm">
          <h2 class="font-heading text-xl font-bold text-cream">Quick tools</h2>
          <p class="mt-1 text-sm text-cream/75">Give every story without a cover a generated one.</p>
          <button
            type="button"
            class="mt-4 inline-flex items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-sm font-bold text-navy transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            :disabled="backfilling || loading"
            @click="backfillCovers"
          >
            <Loader2 v-if="backfilling" class="h-4 w-4 animate-spin" />
            <ImageOff v-else class="h-4 w-4" />
            {{ backfilling ? 'Filling in…' : `Fill missing covers (${missingCovers})` }}
          </button>
          <p v-if="backfillMessage" class="mt-3 text-sm font-semibold text-cream/90">{{ backfillMessage }}</p>
        </section>
      </div>
    </div>
  </div>
</template>
