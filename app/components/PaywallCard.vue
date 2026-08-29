<script setup lang="ts">
import { Lock } from '@lucide/vue'

defineProps<{ paragraphsRemaining: number }>()

const { user } = useAuth()

const target = computed(() => (user.value ? '/checkout' : `/account?next=${encodeURIComponent(useRoute().fullPath)}`))
</script>

<template>
  <div class="relative mt-2 rounded-3xl bg-white p-8 text-center shadow-warm">
    <div class="absolute inset-x-0 -top-16 h-16 bg-gradient-to-t from-cream to-transparent" />
    <Lock class="mx-auto h-9 w-9 text-navy" :stroke-width="1.5" />
    <h3 class="mt-3 font-heading text-xl font-bold text-navy">Unlock the rest of this story</h3>
    <p class="mt-1 text-sm text-ink-muted">
      {{ paragraphsRemaining }} more {{ paragraphsRemaining === 1 ? 'paragraph is' : 'paragraphs are' }} waiting — pay once, read every story on Kidstory forever.
    </p>
    <UiButton :to="target" variant="primary" class="mt-5 justify-center">
      {{ user ? 'Unlock All Stories — $9.99' : 'Sign In to Unlock' }}
    </UiButton>
  </div>
</template>
