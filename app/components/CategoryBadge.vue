<script setup lang="ts">
import type { Category } from '~/data/categories'

withDefaults(defineProps<{ category: Category; active?: boolean; as?: 'button' | 'div' }>(), {
  active: false,
  as: 'button'
})
</script>

<template>
  <component
    :is="as === 'button' ? 'button' : 'div'"
    :type="as === 'button' ? 'button' : undefined"
    class="group flex flex-col items-center gap-2 rounded-2xl px-3 py-2 text-center transition-all duration-200 ease-out hover:-translate-y-1"
    :class="active ? 'ring-2 ring-coral' : ''"
  >
    <span
      class="flex h-14 w-14 items-center justify-center rounded-full text-navy shadow-warm transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-95"
      :class="category.bg"
    >
      <component :is="category.icon" class="h-6 w-6" :stroke-width="2" />
    </span>
    <span class="text-sm font-bold text-navy">{{ category.label }}</span>
  </component>
</template>
