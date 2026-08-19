<script setup lang="ts">
import { Leaf, Heart } from '@lucide/vue'
</script>

<template>
  <section class="px-4 py-10 sm:px-6">
    <div class="relative mx-auto max-w-6xl overflow-hidden rounded-4xl bg-tan/50 shadow-warm">
      <Leaf class="absolute left-6 top-6 z-10 h-7 w-7 text-green opacity-50 animate-float" aria-hidden="true" />
      <Leaf
        class="absolute bottom-6 left-10 z-10 h-6 w-6 text-green opacity-40 animate-float"
        style="animation-delay: 1.5s"
        aria-hidden="true"
      />

      <div class="grid items-center gap-8 p-8 sm:p-12 md:grid-cols-2">
        <div class="text-center md:text-left">
          <p class="font-heading text-2xl font-bold leading-snug text-navy sm:text-3xl">
            "Every story you read plants a little seed of courage, kindness, and wonder."
            <Heart class="inline h-6 w-6 fill-coral text-coral" />
          </p>
          <div class="mt-6">
            <UiButton to="/stories" variant="primary">Start Reading →</UiButton>
          </div>
        </div>

        <div class="overflow-hidden rounded-3xl shadow-warm">
          <IllustrationsWalkingGroupScene class="h-full w-full" />
        </div>
      </div>
    </div>
  </section>
</template>
