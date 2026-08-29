<script setup lang="ts">
import { Search, Menu, X, User } from '@lucide/vue'

const mobileOpen = ref(false)
const route = useRoute()
const { user, hasAccess } = useAuth()

const links = [
  { label: 'Home', to: '/' },
  { label: 'Stories', to: '/stories' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' }
]

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  }
)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-tan/60 bg-cream/90 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <NuxtLink to="/" class="flex items-center gap-2">
        <img src="/logo.png" alt="Kidstory" class="h-9 w-auto" />
      </NuxtLink>

      <nav class="hidden items-center gap-7 md:flex">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="font-body font-bold text-navy transition-colors hover:text-coral"
          active-class="text-green"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="hidden items-center gap-3 md:flex">
        <NuxtLink
          to="/stories"
          aria-label="Search stories"
          class="flex h-10 w-10 items-center justify-center rounded-full text-navy transition-colors hover:bg-tan"
        >
          <Search class="h-5 w-5" />
        </NuxtLink>
        <NuxtLink
          to="/account"
          :aria-label="user ? 'Your account' : 'Sign in'"
          class="flex h-10 w-10 items-center justify-center rounded-full text-navy transition-colors hover:bg-tan"
        >
          <User class="h-5 w-5" />
        </NuxtLink>
        <UiButton v-if="!hasAccess" to="/account" variant="primary" class="!px-5 !py-2 text-sm">
          Unlock All Stories
        </UiButton>
      </div>

      <button
        type="button"
        class="flex h-10 w-10 items-center justify-center rounded-full text-navy md:hidden"
        aria-label="Toggle menu"
        :aria-expanded="mobileOpen"
        @click="mobileOpen = !mobileOpen"
      >
        <X v-if="mobileOpen" class="h-6 w-6" />
        <Menu v-else class="h-6 w-6" />
      </button>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <nav v-if="mobileOpen" class="border-t border-tan/60 bg-cream px-4 pb-5 pt-2 md:hidden">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="block border-b border-tan/50 py-3 font-body font-bold text-navy last:border-none"
        >
          {{ link.label }}
        </NuxtLink>
        <NuxtLink to="/account" class="block border-b border-tan/50 py-3 font-body font-bold text-navy">
          {{ user ? 'Your Account' : 'Sign In' }}
        </NuxtLink>
        <UiButton v-if="!hasAccess" to="/account" variant="primary" class="mt-4 w-full justify-center">
          Unlock All Stories
        </UiButton>
      </nav>
    </Transition>
  </header>
</template>
