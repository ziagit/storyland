<script setup lang="ts">
import { Link2, Play, Pause } from '@lucide/vue'
import { getCategory } from '~/data/categories'
import { formatDate, type Story } from '~/data/stories'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { accessToken } = useAuth()

const { data: story, refresh: refreshStory } = await useFetch<Story>(() => `/api/stories/${slug.value}`, {
  headers: () => (accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {})
})
const { data: allStories } = await useFetch<Story[]>('/api/stories')

if (!story.value) {
  throw createError({ statusCode: 404, statusMessage: 'Story not found' })
}

// The initial (possibly SSR'd) fetch never has the browser's Supabase session, so a
// premium story renders locked at first even for a paying reader — re-fetch with the
// auth header once the session hydrates client-side to unlock it.
watch(accessToken, () => {
  if (story.value?.locked) {
    refreshStory()
  }
})

const category = computed(() => getCategory(story.value!.category))

const ageLabel: Record<string, string> = {
  '3-5': 'Ages 3–5',
  '6-8': 'Ages 6–8',
  '9-12': 'Ages 9–12',
  'all-ages': 'All Ages'
}

const fontScale = ref(1)
function bumpFont(delta: number) {
  fontScale.value = Math.min(1.4, Math.max(0.85, +(fontScale.value + delta).toFixed(2)))
}

const more = computed(() => {
  const list = allStories.value ?? []
  const current = story.value
  if (!current) return []
  const sameCategory = list.filter((s) => s.slug !== current.slug && s.category === current.category)
  const pool = sameCategory.length ? sameCategory : list.filter((s) => s.slug !== current.slug)
  return pool.slice(0, 3)
})

const audioEl = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
function toggleListen() {
  if (!audioEl.value) return
  if (isPlaying.value) {
    audioEl.value.pause()
  } else {
    audioEl.value.play()
  }
}

const shareCopied = ref(false)
async function share() {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  try {
    if (navigator.share) {
      await navigator.share({ title: story.value!.title, url })
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
  title: () => story.value!.title,
  description: () => story.value!.excerpt,
  ogTitle: () => story.value!.title,
  ogDescription: () => story.value!.excerpt
})
</script>

<template>
  <article v-if="story" class="px-4 py-10 sm:px-6">
    <div class="mx-auto max-w-3xl">
      <NuxtLink to="/stories" class="mb-6 inline-flex items-center gap-1 font-bold text-green hover:text-coral">
        ← Back to Stories
      </NuxtLink>

      <div v-reveal>
        <StoryCover :story="story" size="lg" />
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-3 text-sm font-bold" v-reveal>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-tan px-3 py-1 text-navy">
          <component :is="category.icon" class="h-3.5 w-3.5" :stroke-width="2.5" />
          {{ category.label }}
        </span>
        <span class="inline-flex items-center gap-1 rounded-full bg-green/15 px-3 py-1 text-green">
          {{ ageLabel[story.ageRange] }}
        </span>
        <span class="text-ink-muted">{{ story.readTimeMinutes }} min read</span>
        <span class="text-ink-muted">· {{ formatDate(story) }}</span>
      </div>

      <h1 class="mt-4 font-heading text-4xl font-extrabold text-navy sm:text-5xl" v-reveal>
        {{ story.title }}
      </h1>

      <div class="mt-4 flex items-center gap-3" v-reveal>
        <FavoriteButton :slug="story.slug" />
        <template v-if="story.audioUrl">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-navy shadow-warm transition-transform hover:-translate-y-0.5"
            @click="toggleListen"
          >
            <Pause v-if="isPlaying" class="h-4 w-4" />
            <Play v-else class="h-4 w-4" />
            {{ isPlaying ? 'Pause' : 'Listen' }}
          </button>
          <audio
            ref="audioEl"
            :src="story.audioUrl"
            class="hidden"
            @play="isPlaying = true"
            @pause="isPlaying = false"
            @ended="isPlaying = false"
          />
        </template>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-navy shadow-warm transition-transform hover:-translate-y-0.5"
          @click="share"
        >
          <Link2 class="h-4 w-4" />
          {{ shareCopied ? 'Link copied!' : 'Share' }}
        </button>

        <div class="ml-auto flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-warm">
          <button
            type="button"
            aria-label="Decrease text size"
            class="flex h-8 w-8 items-center justify-center rounded-full font-bold text-navy hover:bg-tan"
            @click="bumpFont(-0.1)"
          >
            A-
          </button>
          <button
            type="button"
            aria-label="Increase text size"
            class="flex h-8 w-8 items-center justify-center rounded-full font-bold text-navy hover:bg-tan"
            @click="bumpFont(0.1)"
          >
            A+
          </button>
        </div>
      </div>

      <div
        class="prose-story mt-8 space-y-5 leading-[1.75] text-navy"
        :style="{ fontSize: `${fontScale}rem` }"
        v-reveal
      >
        <p v-for="(paragraph, i) in story.body" :key="i">{{ paragraph }}</p>
      </div>

      <PaywallCard v-if="story.locked" :paragraphs-remaining="(story.lockedBodyCount ?? 1) - story.body.length" v-reveal />

      <div v-if="!story.locked" class="mt-8 flex flex-wrap gap-2" v-reveal>
        <TagPill v-for="tag in story.tags" :key="tag" :label="tag" />
      </div>
    </div>

    <div class="mx-auto mt-16 max-w-6xl" v-reveal>
      <h2 class="mb-6 font-heading text-2xl font-bold text-navy">More Like This</h2>
      <div class="grid gap-6 sm:grid-cols-3">
        <StoryCard v-for="s in more" :key="s.slug" :story="s" />
      </div>
    </div>
  </article>
</template>
