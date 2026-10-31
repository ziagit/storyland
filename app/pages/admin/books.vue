<script setup lang="ts">
import { Eye, Library } from '@lucide/vue'
import type { BookDigestList } from '../../../shared/utils/kidstory-api'

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Book Picks', robots: 'noindex, nofollow' })

// Digests are public and written daily by the books agent (Vercel Cron), so this is a read-only view.
const digests = ref<BookDigestList | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    digests.value = await $fetch<BookDigestList>('/api/books')
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Could not load Book Picks.'
  } finally {
    loading.value = false
  }
})

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
    <h1 class="font-heading text-3xl font-extrabold text-navy sm:text-4xl">Book Picks</h1>
    <p class="mt-1 text-sm text-ink-muted">The books agent researches children's bestsellers and publishes a digest every day.</p>

    <p v-if="error" class="mt-6 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">{{ error }}</p>

    <div v-if="loading" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="n in 6" :key="n" class="h-64 animate-pulse rounded-3xl bg-white/70" />
    </div>

    <div v-else-if="digests?.items.length" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article v-for="d in digests.items" :key="d.slug" class="flex flex-col overflow-hidden rounded-3xl bg-white shadow-warm">
        <div class="flex flex-1 flex-col p-4">
          <BookDigestCover :digest="d" />
          <p class="mt-4 text-xs font-bold uppercase tracking-wide text-green">{{ formatDate(d.publishedAt) }}</p>
          <h2 class="mt-1 font-heading text-lg font-bold leading-snug text-navy">{{ d.title }}</h2>
          <p class="mt-2 line-clamp-3 text-sm text-ink-muted">{{ d.excerpt }}</p>
          <NuxtLink :to="`/books/${d.slug}`" target="_blank" class="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-green hover:text-coral">
            <Eye class="h-4 w-4" /> View on site
          </NuxtLink>
        </div>
      </article>
    </div>

    <div v-else-if="!error" class="mt-6 flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-tan bg-white/50 p-12 text-center">
      <Library class="h-10 w-10 text-tan" />
      <p class="font-bold text-navy">No digests yet</p>
    </div>
  </div>
</template>
