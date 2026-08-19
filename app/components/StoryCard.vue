<script setup lang="ts">
import { getCategory } from '~/data/categories'
import type { Story } from '~/data/stories'

const props = defineProps<{ story: Story }>()
const category = computed(() => getCategory(props.story.category))

const ageLabel: Record<string, string> = {
  '3-5': 'Ages 3–5',
  '6-8': 'Ages 6–8',
  '9-12': 'Ages 9–12',
  'all-ages': 'All Ages'
}
</script>

<template>
  <NuxtLink
    :to="`/stories/${story.slug}`"
    class="group flex flex-col overflow-hidden rounded-3xl bg-white p-3 shadow-warm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-warm-lg"
  >
    <div class="relative">
      <div class="transition-transform duration-500 ease-out group-hover:scale-[1.04]">
        <StoryCover :story="story" />
      </div>
      <div class="absolute right-2 top-2">
        <FavoriteButton :slug="story.slug" size="sm" />
      </div>
    </div>

    <div class="flex flex-1 flex-col gap-2 px-2 pb-2 pt-4">
      <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-green">
        <component :is="category.icon" class="h-3.5 w-3.5" :stroke-width="2.5" />
        <span>{{ category.label }}</span>
      </div>
      <h3 class="font-heading text-lg font-bold leading-snug text-navy transition-colors group-hover:text-coral">
        {{ story.title }}
      </h3>
      <p class="line-clamp-2 flex-1 text-sm text-ink-muted">{{ story.excerpt }}</p>
      <div class="mt-1 flex items-center justify-between text-xs font-semibold text-ink-muted">
        <span>{{ story.readTimeMinutes }} min read</span>
        <span>{{ ageLabel[story.ageRange] }}</span>
      </div>
    </div>
  </NuxtLink>
</template>
