<script setup lang="ts">
import { Star, Sparkle, Heart } from '@lucide/vue'
</script>

<template>
  <section class="relative px-4 pt-8 sm:px-6 sm:pt-10">
    <div class="mx-auto max-w-6xl">
      <div class="relative overflow-hidden rounded-4xl shadow-warm-lg">
        <div class="absolute inset-0">
          <IllustrationsHeroScene class="h-full w-full" />
        </div>

        <div class="relative z-10 px-6 py-14 sm:px-12 sm:py-20">
          <div class="max-w-xl animate-fade-slide-up">
            <span class="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-sm font-bold text-green backdrop-blur">
              <Star class="h-4 w-4 fill-coral text-coral" />
              30 free stories and counting
            </span>
            <h1 class="relative font-heading text-4xl font-extrabold leading-[1.1] text-navy sm:text-5xl lg:text-6xl">
              <Sparkle class="absolute -left-8 -top-6 hidden h-6 w-6 text-coral animate-sparkle sm:inline" aria-hidden="true" />
              Big Adventures,<br />
              <span class="relative text-green">
                Little Readers.
                <Heart class="absolute -right-9 -top-2 h-6 w-6 fill-coral text-coral animate-pop-heart" aria-hidden="true" />
              </span>
            </h1>
            <p class="mt-5 max-w-md text-lg text-ink-muted">
              Warm, illustrated short stories that spark imagination, teach kindness, and make story time the best
              time of the day.
            </p>
            <div class="mt-8 flex flex-wrap gap-4">
              <UiButton to="/stories" variant="primary">Read Stories →</UiButton>
              <UiButton to="/about" variant="secondary" class="!border-navy/10 !bg-white/85 backdrop-blur">
                About Kidstory
                <Heart class="h-4 w-4 fill-coral text-coral" />
              </UiButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
