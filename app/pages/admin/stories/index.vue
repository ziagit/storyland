<script setup lang="ts">
import { Search, Pencil, Trash2, Eye, Wand2, Loader2 } from '@lucide/vue'
import { categories } from '~/data/categories'
import type { StorySummary } from '../../../../shared/utils/kidstory-api'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Stories', robots: 'noindex, nofollow' })

const adminFetch = useAdminApi()

const stories = ref<StorySummary[]>([])
const loading = ref(true)
const error = ref('')

const search = ref('')
const category = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    stories.value = await adminFetch<StorySummary[]>('/api/admin/stories')
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Could not load stories.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

// The whole catalog is a few dozen summaries, so filter here for instant results.
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return stories.value.filter(
    (s) =>
      (!category.value || s.category === category.value) &&
      (!q || s.title.toLowerCase().includes(q) || s.excerpt.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q)))
  )
})

const categoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug
const ageLabel = (value: string) => (value === 'all-ages' ? 'All ages' : `Ages ${value.replace('-', '–')}`)
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

const toDelete = ref<StorySummary | null>(null)
const deleting = ref(false)
async function confirmDelete() {
  if (!toDelete.value) return
  deleting.value = true
  try {
    await adminFetch(`/api/admin/stories/${toDelete.value.slug}`, { method: 'DELETE' })
    stories.value = stories.value.filter((s) => s.slug !== toDelete.value!.slug)
    toDelete.value = null
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Could not delete the story.'
    toDelete.value = null
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-heading text-3xl font-extrabold text-navy sm:text-4xl">Stories</h1>
        <p class="mt-1 text-sm text-ink-muted">
          <template v-if="loading">Loading…</template>
          <template v-else>{{ filtered.length }} of {{ stories.length }} stories</template>
        </p>
      </div>
      <UiButton to="/admin/studio" variant="primary">
        <Wand2 class="h-4 w-4" /> New story
      </UiButton>
    </div>

    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
      <label class="relative flex-1">
        <Search class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          v-model="search"
          type="search"
          placeholder="Search titles, excerpts, tags…"
          class="w-full rounded-full border-2 border-tan bg-white py-2.5 pl-11 pr-4 text-sm text-navy outline-none focus:border-green"
        />
      </label>
      <select v-model="category" class="rounded-full border-2 border-tan bg-white px-4 py-2.5 text-sm font-semibold text-navy outline-none focus:border-green">
        <option value="">All categories</option>
        <option v-for="cat in categories" :key="cat.slug" :value="cat.slug">{{ cat.label }}</option>
      </select>
    </div>

    <p v-if="error" class="mt-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">{{ error }}</p>

    <div class="mt-6 overflow-hidden rounded-3xl bg-white shadow-warm">
      <div v-if="loading" class="space-y-3 p-5">
        <div v-for="n in 6" :key="n" class="h-14 animate-pulse rounded-2xl bg-tan/40" />
      </div>

      <ul v-else class="divide-y divide-tan/60">
        <li v-for="story in filtered" :key="story.slug" class="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-cream/60">
          <div class="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-cream">
            <img v-if="story.coverImageUrl" :src="story.coverImageUrl" alt="" class="h-full w-full object-cover" loading="lazy" />
            <span v-else class="flex h-full w-full items-center justify-center text-2xl">{{ story.emoji }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <NuxtLink :to="`/admin/stories/${story.slug}`" class="block truncate font-bold text-navy hover:text-green">{{ story.title }}</NuxtLink>
            <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              <span class="rounded-full bg-tan px-2.5 py-0.5 font-bold text-navy">{{ categoryLabel(story.category) }}</span>
              <span class="rounded-full bg-green/15 px-2.5 py-0.5 font-bold text-green">{{ ageLabel(story.ageRange) }}</span>
              <span class="text-ink-muted">{{ formatDate(story.publishedAt) }}</span>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <NuxtLink :to="`/stories/${story.slug}`" target="_blank" class="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-tan hover:text-navy" :aria-label="`View ${story.title}`">
              <Eye class="h-4 w-4" />
            </NuxtLink>
            <NuxtLink :to="`/admin/stories/${story.slug}`" class="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-tan hover:text-navy" :aria-label="`Edit ${story.title}`">
              <Pencil class="h-4 w-4" />
            </NuxtLink>
            <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-coral/10 hover:text-coral" :aria-label="`Delete ${story.title}`" @click="toDelete = story">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </li>
        <li v-if="!filtered.length" class="px-5 py-12 text-center text-sm text-ink-muted">No stories match.</li>
      </ul>
    </div>

    <!-- Delete confirmation -->
    <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0" leave-active-class="transition duration-100" leave-to-class="opacity-0">
      <div v-if="toDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm" @click.self="toDelete = null">
        <div class="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-warm-lg">
          <span class="text-4xl">{{ toDelete.emoji }}</span>
          <h2 class="mt-2 font-heading text-xl font-bold text-navy">Delete this story?</h2>
          <p class="mt-1 text-sm text-ink-muted">"{{ toDelete.title }}" will be removed from the site. This can't be undone.</p>
          <div class="mt-5 flex justify-center gap-3">
            <UiButton variant="secondary" @click="toDelete = null">Cancel</UiButton>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 font-bold text-white transition-colors hover:bg-navy disabled:opacity-60"
              :disabled="deleting"
              @click="confirmDelete"
            >
              <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
              <Trash2 v-else class="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
