<script setup lang="ts">
import { Heart } from '@lucide/vue'
</script>

<template>
  <div class="flex h-full flex-col justify-between rounded-3xl bg-white p-8 shadow-warm">
    <div>
      <h3 class="mb-2 flex items-center gap-2 font-heading text-2xl font-bold text-navy">
        About This Blog <Heart class="h-5 w-5 text-coral" />
      </h3>
      <p class="text-ink-muted">
        Kidstory is a cozy corner of the internet where short, gentle stories help kids grow braver,
        kinder, and more curious about the world — one bedtime story at a time.
      </p>
    </div>
    <UiButton to="/about" variant="secondary" class="mt-6 self-start">
      Learn More About Us →
    </UiButton>
  </div>
</template>
