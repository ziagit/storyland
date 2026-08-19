<script setup lang="ts">
import { Heart, Sparkles, Search, ShieldCheck, BookOpen, Palette, Ear } from '@lucide/vue'

useSeoMeta({
  title: 'About',
  description: 'Why Kidstory exists — a cozy home for warm, gentle short stories that help kids grow braver, kinder, and more curious.'
})

const values = [
  { icon: Heart, label: 'Kindness', bg: 'bg-coral/15' },
  { icon: Sparkles, label: 'Imagination', bg: 'bg-navy/10' },
  { icon: Search, label: 'Curiosity', bg: 'bg-green/15' },
  { icon: ShieldCheck, label: 'Safety', bg: 'bg-tan' }
]

const team = [
  { name: 'Amara', role: 'Founder & Storyteller', icon: BookOpen },
  { name: 'Leo', role: 'Illustration Lead', icon: Palette },
  { name: 'Nia', role: 'Editor for Little Ears', icon: Ear }
]
</script>

<template>
  <div class="px-4 py-14 sm:px-6">
    <div class="mx-auto max-w-3xl text-center" v-reveal>
      <span class="mb-4 inline-flex items-center gap-2 rounded-full bg-tan px-4 py-1.5 text-sm font-bold text-green">
        About This Blog <Heart class="h-4 w-4" />
      </span>
      <h1 class="font-heading text-4xl font-extrabold text-navy sm:text-5xl">Why Kidstory Exists</h1>
      <p class="mt-5 text-lg text-ink-muted">
        Kidstory started as a handful of bedtime stories written for one sleepy kid who refused to sleep
        without "just one more story." Today it's a growing library of short, gentle tales meant to be
        read aloud, giggled over, and revisited again and again — because the best lessons in kindness,
        courage, and curiosity are the ones wrapped inside a good story.
      </p>
      <p class="mt-4 text-lg text-ink-muted">
        Every story is written to be finished in one sitting, easy enough for early readers and warm
        enough for parents to enjoy reading aloud, too.
      </p>
    </div>

    <div class="mx-auto mt-16 max-w-5xl" v-reveal>
      <h2 class="mb-8 text-center font-heading text-2xl font-bold text-navy">Our Values</h2>
      <div class="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <div v-for="value in values" :key="value.label" class="flex flex-col items-center gap-3 text-center">
          <span class="flex h-16 w-16 items-center justify-center rounded-full text-navy shadow-warm" :class="value.bg">
            <component :is="value.icon" class="h-7 w-7" :stroke-width="2" />
          </span>
          <span class="font-bold text-navy">{{ value.label }}</span>
        </div>
      </div>
    </div>

    <div class="mx-auto mt-16 max-w-5xl" v-reveal>
      <h2 class="mb-8 text-center font-heading text-2xl font-bold text-navy">Who Writes Your Stories</h2>
      <div class="grid gap-6 sm:grid-cols-3">
        <div
          v-for="person in team"
          :key="person.name"
          class="flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center shadow-warm transition-transform hover:-translate-y-1"
        >
          <span class="flex h-20 w-20 items-center justify-center rounded-full bg-tan text-navy">
            <component :is="person.icon" class="h-9 w-9" :stroke-width="1.75" />
          </span>
          <h3 class="font-heading text-lg font-bold text-navy">{{ person.name }}</h3>
          <p class="text-sm text-ink-muted">{{ person.role }}</p>
        </div>
      </div>
    </div>

    <div class="mx-auto mt-16 max-w-3xl text-center" v-reveal>
      <UiButton to="/stories" variant="primary">Start Reading Stories →</UiButton>
    </div>
  </div>
</template>
