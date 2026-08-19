<script setup lang="ts">
import { Search } from '@lucide/vue'

const model = defineModel<string>({ default: '' })
</script>

<template>
  <label class="relative block">
    <span class="sr-only">Search stories</span>
    <Search class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
    <input
      v-model="model"
      type="search"
      placeholder="Search stories by title or keyword…"
      class="w-full rounded-full border-2 border-tan bg-white py-3 pl-11 pr-5 font-body text-navy shadow-warm outline-none transition-colors focus:border-coral"
    />
  </label>
</template>
