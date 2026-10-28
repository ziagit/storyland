<script setup lang="ts">
import type { BookDigestSummary } from '../../shared/utils/kidstory-api'

const props = withDefaults(defineProps<{ digest: BookDigestSummary; size?: 'sm' | 'lg' }>(), { size: 'sm' })

// Covers come from Pollinations, which sometimes refuses; fall back to the emoji.
const imageFailed = ref(false)
const showImage = computed(() => !!props.digest.coverImageUrl && !imageFailed.value)
</script>

<template>
  <div
    class="relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-green/20 via-tan to-cream"
    :class="size === 'lg' ? 'aspect-[16/9]' : 'aspect-[4/3]'"
  >
    <img
      v-if="showImage"
      :src="digest.coverImageUrl!"
      :alt="digest.title"
      loading="lazy"
      class="h-full w-full object-cover"
      @error="imageFailed = true"
    />
    <span v-else class="select-none drop-shadow-sm" :class="size === 'lg' ? 'text-8xl' : 'text-6xl'" aria-hidden="true">
      {{ digest.emoji || '📚' }}
    </span>
  </div>
</template>
