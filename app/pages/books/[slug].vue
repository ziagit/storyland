<script setup lang="ts">
import { ExternalLink, Link2 } from '@lucide/vue'
import type { BookDigest } from '../../../shared/utils/kidstory-api'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: digest } = await useFetch<BookDigest>(() => `/api/books/${slug.value}`)

if (!digest.value) {
  throw createError({ statusCode: 404, statusMessage: 'Digest not found' })
}

const published = computed(() =>
  new Date(digest.value!.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
)

const shareCopied = ref(false)
async function share() {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  try {
    if (navigator.share) {
      await navigator.share({ title: digest.value!.title, url })
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url)
      shareCopied.value = true
      setTimeout(() => (shareCopied.value = false), 2000)
    }
  } catch {
    // user cancelled share — nothing to do
  }
}

useSeoMeta({
  title: () => digest.value!.title,
  description: () => digest.value!.excerpt,
  ogTitle: () => digest.value!.title,
  ogDescription: () => digest.value!.excerpt,
  ogImage: () => digest.value!.coverImageUrl ?? undefined
})
</script>

<template>
  <article v-if="digest" class="px-4 py-10 sm:px-6">
    <div class="mx-auto max-w-3xl">
      <NuxtLink to="/books" class="mb-6 inline-flex items-center gap-1 font-bold text-green hover:text-coral">
        ← All Book Picks
      </NuxtLink>

      <div v-reveal>
        <BookDigestCover :digest="digest" size="lg" />
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-3 text-sm font-bold" v-reveal>
        <span class="rounded-full bg-tan px-3 py-1 text-navy">Book Picks</span>
        <span class="text-ink-muted">{{ published }}</span>
      </div>

      <h1 class="mt-4 font-heading text-4xl font-extrabold text-navy sm:text-5xl" v-reveal>
        {{ digest.title }} {{ digest.emoji }}
      </h1>

      <div class="mt-4" v-reveal>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-navy shadow-warm transition-transform hover:-translate-y-0.5"
          @click="share"
        >
          <Link2 class="h-4 w-4" />
          {{ shareCopied ? 'Link copied!' : 'Share' }}
        </button>
      </div>

      <div class="mt-8 space-y-5 text-lg leading-[1.75] text-navy" v-reveal>
        <p v-for="(paragraph, i) in digest.body" :key="i">{{ paragraph }}</p>
      </div>

      <section class="mt-10" v-reveal>
        <h2 class="mb-4 font-heading text-2xl font-bold text-navy">The books</h2>
        <ul class="space-y-3">
          <li v-for="book in digest.books" :key="book.title" class="rounded-2xl bg-white p-4 shadow-warm">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <p class="font-heading text-lg font-bold text-navy">{{ book.title }}</p>
              <span class="rounded-full bg-green/15 px-3 py-0.5 text-sm font-bold text-green">Ages {{ book.ages }}</span>
            </div>
            <p class="text-sm font-bold text-ink-muted">by {{ book.author }}</p>
            <p class="mt-1 text-navy">{{ book.why }}</p>
          </li>
        </ul>
      </section>

      <section class="mt-10 rounded-2xl border border-tan p-5" v-reveal>
        <h2 class="font-heading text-lg font-bold text-navy">Where the rankings come from</h2>
        <ul class="mt-2 space-y-1">
          <li v-for="source in digest.sources" :key="source.url">
            <a
              :href="source.url"
              target="_blank"
              rel="noopener noreferrer nofollow"
              class="inline-flex items-center gap-1 font-bold text-green underline-offset-2 hover:text-coral hover:underline"
            >
              {{ source.title }}
              <ExternalLink class="h-3.5 w-3.5" />
            </a>
          </li>
        </ul>
        <p class="mt-3 text-sm text-ink-muted">
          Researched and written by Kidstory's AI from public bestseller lists. Rankings change every week, so check
          with your bookshop before you buy.
        </p>
      </section>
    </div>
  </article>
</template>
