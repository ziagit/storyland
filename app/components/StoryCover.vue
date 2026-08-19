<script setup lang="ts">
import { Sparkle } from '@lucide/vue'
import { getCategory } from '~/data/categories'
import type { Story } from '~/data/stories'

const props = withDefaults(defineProps<{ story: Story; size?: 'sm' | 'lg' }>(), { size: 'sm' })
const category = computed(() => getCategory(props.story.category))

const gradients: Record<string, string> = {
  adventure: 'from-coral/30 via-tan to-cream',
  bedtime: 'from-navy/20 via-tan to-cream',
  animals: 'from-green/25 via-tan to-cream',
  friendship: 'from-tan via-cream to-coral/15',
  'fairy-tale': 'from-coral/25 via-cream to-tan',
  funny: 'from-green/20 via-cream to-tan'
}

const imageFailed = ref(false)
const showImage = computed(() => !!props.story.coverImageUrl && !imageFailed.value)
</script>

<template>
  <div
    class="relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br"
    :class="[gradients[story.category], size === 'lg' ? 'aspect-[16/9]' : 'aspect-[4/3]']"
  >
    <img
      v-if="showImage"
      :src="story.coverImageUrl!"
      :alt="story.title"
      loading="lazy"
      class="h-full w-full object-cover"
      @error="imageFailed = true"
    />
    <template v-else>
      <Sparkle
        class="absolute -left-4 -top-4 h-7 w-7 text-coral opacity-40 animate-sparkle"
        aria-hidden="true"
      />
      <Sparkle
        class="absolute -bottom-3 -right-3 h-7 w-7 text-coral opacity-30 animate-sparkle"
        style="animation-delay: 1.2s"
        aria-hidden="true"
      />
      <span
        class="select-none drop-shadow-sm"
        :class="size === 'lg' ? 'text-8xl' : 'text-6xl'"
        role="img"
        :aria-label="category.label"
      >
        {{ story.emoji }}
      </span>
    </template>
  </div>
</template>
