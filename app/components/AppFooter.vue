<script setup lang="ts">
import { Camera, Users, Video, Heart } from '@lucide/vue'

const links = [
  { label: 'Home', to: '/' },
  { label: 'Stories', to: '/stories' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' }
]

const socials = [
  { label: 'Instagram', icon: Camera, href: '#' },
  { label: 'Facebook', icon: Users, href: '#' },
  { label: 'YouTube', icon: Video, href: '#' }
]
</script>

<template>
  <footer class="border-t border-tan/60 bg-tan/40">
    <div class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
      <div class="max-w-xs">
        <img src="/logo.png" alt="Kidstory" class="h-10 w-auto" />
        <p class="mt-3 text-sm text-ink-muted">
          Warm, gentle stories that help little readers grow braver, kinder, and more curious — one page at a time.
        </p>
      </div>

      <div class="flex gap-12">
        <div>
          <h4 class="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-navy">Explore</h4>
          <ul class="space-y-2 text-sm">
            <li v-for="link in links" :key="link.to">
              <NuxtLink :to="link.to" class="text-ink-muted transition-colors hover:text-coral">
                {{ link.label }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/studio" class="text-ink-muted transition-colors hover:text-coral">
                Login
              </NuxtLink>
            </li>
          </ul>
        </div>

        <div>
          <h4 class="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-navy">Follow</h4>
          <div class="flex gap-2">
            <a
              v-for="social in socials"
              :key="social.label"
              :href="social.href"
              :aria-label="social.label"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-navy shadow-warm transition-transform hover:-translate-y-0.5"
            >
              <component :is="social.icon" class="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-center gap-1 border-t border-tan/60 px-4 py-4 text-center text-xs text-ink-muted sm:px-6">
      © {{ new Date().getFullYear() }} Kidstory. Made with <Heart class="h-3 w-3 fill-green text-green" /> for little readers everywhere.
    </div>
  </footer>
</template>
