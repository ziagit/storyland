<script setup lang="ts">
import { BookOpen } from '@lucide/vue'
import type { BookDigestList } from '../../../shared/utils/kidstory-api'

useSeoMeta({
  title: 'Book Picks',
  description: "A daily look at the children's books selling best right now, and which ones might suit your child."
})

const { data, error } = await useFetch<BookDigestList>('/api/books')

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="px-4 py-10 sm:px-6">
    <div class="mx-auto max-w-6xl">
      <div class="mb-8 text-center" v-reveal>
        <h1 class="font-heading text-4xl font-bold text-navy">Book Picks</h1>
        <p class="mx-auto mt-2 max-w-2xl text-ink-muted">
          Every day we check the children's bestseller lists and pick out the books worth knowing about, with notes on
          who each one suits.
        </p>
      </div>

      <div v-if="data?.items.length" class="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="digest in data.items"
          :key="digest.slug"
          :to="`/books/${digest.slug}`"
          class="group flex h-full flex-col rounded-3xl bg-white p-4 shadow-warm transition-all duration-200 hover:-translate-y-1 hover:shadow-warm-lg"
          v-reveal
        >
          <BookDigestCover :digest="digest" />
          <p class="mt-4 text-sm font-bold text-ink-muted">{{ formatDay(digest.publishedAt) }}</p>
          <h2 class="mt-1 font-heading text-xl font-bold text-navy group-hover:text-coral">
            {{ digest.title }} {{ digest.emoji }}
          </h2>
          <p class="mt-2 text-ink-muted">{{ digest.excerpt }}</p>
        </NuxtLink>
      </div>
      <div v-else class="rounded-3xl bg-white p-12 text-center shadow-warm" v-reveal>
        <BookOpen class="mx-auto h-10 w-10 text-ink-muted" :stroke-width="1.5" />
        <p class="mt-3 font-bold text-navy">{{ error ? "Book Picks couldn't load right now." : 'The first Book Picks are on their way.' }}</p>
        <p class="text-ink-muted">{{ error ? 'Please try again in a little while.' : 'Check back tomorrow.' }}</p>
      </div>
    </div>
  </div>
</template>
