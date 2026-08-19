<script setup lang="ts">
const props = defineProps<{ slug: string; size?: 'sm' | 'md' }>()
const { isFavorite, toggleFavorite } = useFavorites()

function onClick() {
  toggleFavorite(props.slug)
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center rounded-full shadow-warm transition-all duration-150 hover:scale-110 active:scale-90"
    :class="[
      size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
      isFavorite(slug) ? 'bg-coral' : 'bg-white/90'
    ]"
    :aria-pressed="isFavorite(slug)"
    :aria-label="isFavorite(slug) ? 'Remove from favorites' : 'Add to favorites'"
    @click.stop.prevent="onClick"
  >
    <svg
      viewBox="0 0 24 24"
      :class="[size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', isFavorite(slug) ? 'animate-pop-heart' : '']"
      :fill="isFavorite(slug) ? '#FFFFFF' : 'none'"
      stroke="#E36656"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 20.5s-7.5-4.6-10-9.1C.5 8 2 4.5 5.4 4a5 5 0 0 1 6.6 2.6A5 5 0 0 1 18.6 4C22 4.5 23.5 8 22 11.4c-2.5 4.5-10 9.1-10 9.1Z"
      />
    </svg>
  </button>
</template>
