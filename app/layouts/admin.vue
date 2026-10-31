<script setup lang="ts">
import { LayoutDashboard, BookOpen, Wand2, Library, Users, ExternalLink, LogOut } from '@lucide/vue'

const { user, signOut } = useAuth()

const nav = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Stories', to: '/admin/stories', icon: BookOpen, exact: false },
  { label: 'Studio', to: '/admin/studio', icon: Wand2, exact: false },
  { label: 'Book Picks', to: '/admin/books', icon: Library, exact: false },
  { label: 'Visitors', to: '/admin/visitors', icon: Users, exact: false }
]

const route = useRoute()
const isActive = (item: (typeof nav)[number]) => (item.exact ? route.path === item.to : route.path.startsWith(item.to))

async function onSignOut() {
  await signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-cream lg:flex">
    <!-- Sidebar (desktop) -->
    <aside class="hidden w-64 shrink-0 flex-col border-r border-tan/70 bg-white/70 px-4 py-6 backdrop-blur lg:sticky lg:top-0 lg:flex lg:h-screen">
      <NuxtLink to="/admin" class="flex items-center gap-2 px-2">
        <img src="/logo.png" alt="Kidstory" class="h-9 w-auto" />
        <span class="rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream">Admin</span>
      </NuxtLink>

      <nav class="mt-8 flex flex-col gap-1">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-2xl px-4 py-2.5 font-bold transition-colors"
          :class="isActive(item) ? 'bg-green text-white shadow-warm' : 'text-navy hover:bg-tan/60'"
        >
          <component :is="item.icon" class="h-[18px] w-[18px]" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="mt-auto space-y-1 border-t border-tan/70 pt-4">
        <NuxtLink to="/" class="flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-bold text-ink-muted hover:bg-tan/60 hover:text-navy">
          <ExternalLink class="h-4 w-4" /> View site
        </NuxtLink>
        <button type="button" class="flex w-full items-center gap-3 rounded-2xl px-4 py-2 text-sm font-bold text-ink-muted hover:bg-coral/10 hover:text-coral" @click="onSignOut">
          <LogOut class="h-4 w-4" /> Sign out
        </button>
        <p v-if="user" class="truncate px-4 pt-2 text-xs text-ink-muted" :title="user.email">{{ user.email }}</p>
      </div>
    </aside>

    <!-- Top bar (mobile) -->
    <header class="sticky top-0 z-30 border-b border-tan/70 bg-cream/95 backdrop-blur lg:hidden">
      <div class="flex items-center justify-between px-4 py-3">
        <NuxtLink to="/admin" class="flex items-center gap-2">
          <img src="/logo.png" alt="Kidstory" class="h-8 w-auto" />
          <span class="rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream">Admin</span>
        </NuxtLink>
        <div class="flex items-center gap-1">
          <NuxtLink to="/" aria-label="View site" class="flex h-9 w-9 items-center justify-center rounded-full text-navy hover:bg-tan">
            <ExternalLink class="h-4 w-4" />
          </NuxtLink>
          <button type="button" aria-label="Sign out" class="flex h-9 w-9 items-center justify-center rounded-full text-navy hover:bg-coral/10 hover:text-coral" @click="onSignOut">
            <LogOut class="h-4 w-4" />
          </button>
        </div>
      </div>
      <nav class="flex gap-1 overflow-x-auto px-3 pb-2">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold"
          :class="isActive(item) ? 'bg-green text-white' : 'text-navy hover:bg-tan/60'"
        >
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.label }}
        </NuxtLink>
      </nav>
    </header>

    <main class="min-w-0 flex-1">
      <slot />
    </main>
  </div>
</template>
