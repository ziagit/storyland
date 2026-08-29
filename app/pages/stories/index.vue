<script setup lang="ts">
import { Search } from '@lucide/vue'
import type { Story } from '~/data/stories'

useSeoMeta({
  title: 'Stories',
  description: 'Browse all Kidstory short stories — filter by category, age range, or search by keyword.'
})

const route = useRoute()

const { data: stories } = await useFetch<Story[]>('/api/stories')

const search = ref(typeof route.query.search === 'string' ? route.query.search : '')
const category = ref(typeof route.query.category === 'string' ? route.query.category : 'all')
const age = ref('all')
const visibleCount = ref(8)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return (stories.value ?? []).filter((story) => {
    const matchesCategory = category.value === 'all' || story.category === category.value
    const matchesAge = age.value === 'all' || story.ageRange === age.value
    const matchesSearch =
      !q ||
      story.title.toLowerCase().includes(q) ||
      story.excerpt.toLowerCase().includes(q) ||
      story.tags.some((tag) => tag.toLowerCase().includes(q))
    return matchesCategory && matchesAge && matchesSearch
  })
})

const visibleStories = computed(() => filtered.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < filtered.value.length)

watch([search, category, age], () => {
  visibleCount.value = 8
})
</script>

<template>
  <div class="px-4 py-10 sm:px-6">
    <div class="mx-auto max-w-6xl">
      <div class="mb-8 text-center" v-reveal>
        <h1 class="font-heading text-4xl font-bold text-navy">All Stories</h1>
        <p class="mt-2 text-ink-muted">{{ filtered.length }} stories to explore and enjoy together.</p>
      </div>

      <div class="mb-8 flex flex-col gap-5" v-reveal>
        <SearchBar v-model="search" />
        <FilterBar v-model:category="category" v-model:age="age" />
      </div>

      <div v-if="visibleStories.length" class="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="story in visibleStories" :key="story.slug" class="h-full" v-reveal>
          <StoryCard :story="story" />
        </div>
      </div>
      <div v-else class="rounded-3xl bg-white p-12 text-center shadow-warm" v-reveal>
        <Search class="mx-auto h-10 w-10 text-ink-muted" :stroke-width="1.5" />
        <p class="mt-3 font-bold text-navy">No stories found.</p>
        <p class="text-ink-muted">Try a different search term or filter.</p>
      </div>

      <div v-if="hasMore" class="mt-10 flex justify-center">
        <UiButton variant="secondary" @click="visibleCount += 8">Load More Stories</UiButton>
      </div>
    </div>
  </div>
</template>
