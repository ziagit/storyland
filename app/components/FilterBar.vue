<script setup lang="ts">
import { categories } from '~/data/categories'

const category = defineModel<string>('category', { default: 'all' })
const age = defineModel<string>('age', { default: 'all' })

const ages = [
  { value: 'all', label: 'All Ages' },
  { value: '3-5', label: '3–5' },
  { value: '6-8', label: '6–8' },
  { value: '9-12', label: '9–12' },
  { value: 'all-ages', label: 'Any Age' }
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-full px-4 py-1.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
        :class="category === 'all' ? 'bg-navy text-white shadow-warm' : 'bg-white text-navy hover:bg-tan'"
        @click="category = 'all'"
      >
        All Categories
      </button>
      <button
        v-for="cat in categories"
        :key="cat.slug"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
        :class="category === cat.slug ? 'bg-navy text-white shadow-warm' : 'bg-white text-navy hover:bg-tan'"
        @click="category = cat.slug"
      >
        <component :is="cat.icon" class="h-4 w-4" :stroke-width="2.5" />
        {{ cat.label }}
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="text-sm font-bold text-ink-muted">Age:</span>
      <button
        v-for="band in ages"
        :key="band.value"
        type="button"
        class="rounded-full px-3.5 py-1 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
        :class="age === band.value ? 'bg-coral text-white shadow-warm' : 'bg-white text-ink-muted hover:bg-tan'"
        @click="age = band.value"
      >
        {{ band.label }}
      </button>
    </div>
  </div>
</template>
