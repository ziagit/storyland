<script setup lang="ts">
import { Heart, Shield, Sparkles, Users, PawPrint, Search, ChevronRight } from '@lucide/vue'
import { categories } from '~/data/categories'
import type { Story } from '~/data/stories'

useSeoMeta({
  title: 'Big Adventures, Little Readers',
  description: 'Kidstory is a blog of warm, illustrated short stories for kids — adventure, bedtime, animals, friendship, fairy tales and funny stories.'
})

const { data: stories } = await useFetch<Story[]>('/api/stories')
const featured = computed(() => stories.value?.slice(0, 4) ?? [])

const popularTags = [
  { label: 'Kindness', icon: Heart },
  { label: 'Courage', icon: Shield },
  { label: 'Magic', icon: Sparkles },
  { label: 'Family', icon: Users },
  { label: 'Animals', icon: PawPrint },
  { label: 'Curiosity', icon: Search }
]
</script>

<template>
  <div>
    <HeroSection />

    <section class="relative z-20 -mt-10 px-4 sm:px-6" v-reveal>
      <div class="mx-auto max-w-6xl">
        <div class="rounded-4xl bg-white/90 p-6 shadow-warm-lg backdrop-blur sm:p-8">
          <div class="grid grid-cols-3 gap-4 sm:grid-cols-6">
            <CategoryBadge
              v-for="cat in categories"
              :key="cat.slug"
              :category="cat"
              as="div"
              @click="navigateTo(`/stories?category=${cat.slug}`)"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 py-16 sm:px-6">
      <div class="mx-auto max-w-6xl">
        <div class="mb-8 flex items-end justify-between" v-reveal>
          <h2 class="font-heading text-3xl font-bold text-navy">
            <ChevronRight class="mr-1 inline-block h-7 w-7 text-coral" :stroke-width="3" aria-hidden="true" />Featured Stories
          </h2>
          <NuxtLink to="/stories" class="font-bold text-green hover:text-coral">View All Stories →</NuxtLink>
        </div>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="story in featured" :key="story.slug" v-reveal>
            <StoryCard :story="story" />
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 py-10 sm:px-6">
      <div class="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
        <div v-reveal><AboutTeaserCard /></div>
        <div v-reveal><NewsletterCard /></div>
      </div>
    </section>

    <section class="px-4 py-10 sm:px-6" v-reveal>
      <div class="mx-auto max-w-6xl text-center">
        <h2 class="mb-6 font-heading text-2xl font-bold text-navy">
          <ChevronRight class="mr-1 inline-block h-6 w-6 text-coral" :stroke-width="3" aria-hidden="true" />Popular Tags
        </h2>
        <div class="flex flex-wrap justify-center gap-3">
          <NuxtLink v-for="tag in popularTags" :key="tag.label" :to="`/stories?search=${tag.label}`">
            <TagPill :label="tag.label" :icon="tag.icon" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <div v-reveal>
      <QuoteBanner />
    </div>
  </div>
</template>
