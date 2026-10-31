<script setup lang="ts">
import { Mail, BookOpen } from '@lucide/vue'

useSeoMeta({
  title: 'Account',
  description: 'Sign in to Kidstory with a magic link — no password needed.'
})

const route = useRoute()
const { user, ready, signInWithOtp, signOut } = useAuth()

const email = ref('')
const sendState = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const sendError = ref('')

const nextPath = typeof route.query.next === 'string' ? route.query.next : '/account'

async function sendLink() {
  if (!email.value.trim()) return
  sendState.value = 'sending'
  const { error } = await signInWithOtp(email.value.trim(), nextPath)
  if (error) {
    sendState.value = 'error'
    sendError.value = error
  } else {
    sendState.value = 'sent'
  }
}

// After clicking the magic link, land back on whatever page sent the user here.
watch(user, (u) => {
  if (u && typeof route.query.next === 'string' && route.query.next !== '/account') {
    navigateTo(route.query.next)
  }
})
</script>

<template>
  <div class="px-4 py-16 sm:px-6">
    <div class="mx-auto max-w-md">
      <div class="rounded-3xl bg-white p-8 text-center shadow-warm" v-reveal>
        <h1 class="font-heading text-3xl font-bold text-navy">Your Account</h1>

        <template v-if="!ready">
          <p class="mt-4 text-ink-muted">Loading…</p>
        </template>

        <template v-else-if="!user">
          <p class="mt-3 text-ink-muted">Sign in with your email — we'll send a magic link, no password needed.</p>
          <form class="mt-6 flex flex-col gap-3" @submit.prevent="sendLink">
            <input
              v-model="email"
              type="email"
              required
              placeholder="you@example.com"
              class="rounded-full border-2 border-navy/15 px-5 py-3 text-navy outline-none focus:border-green"
            />
            <UiButton type="submit" variant="primary" class="justify-center" :class="{ 'pointer-events-none opacity-60': sendState === 'sending' }">
              <Mail class="h-4 w-4" />
              {{ sendState === 'sending' ? 'Sending…' : 'Send Magic Link' }}
            </UiButton>
          </form>
          <p v-if="sendState === 'sent'" class="mt-4 font-bold text-green">Check your inbox for a sign-in link!</p>
          <p v-if="sendState === 'error'" class="mt-4 font-bold text-coral">{{ sendError }}</p>
        </template>

        <template v-else>
          <p class="mt-3 text-ink-muted">Signed in as <span class="font-bold text-navy">{{ user.email }}</span></p>

          <div class="mt-6 rounded-2xl bg-green/10 p-5">
            <BookOpen class="mx-auto h-8 w-8 text-green" />
            <p class="mt-2 font-bold text-navy">Every story is free</p>
            <p class="text-sm text-ink-muted">Read as many as you like, as often as you like.</p>
            <UiButton to="/stories" variant="primary" class="mt-4 w-full justify-center">
              Browse Stories
            </UiButton>
          </div>

          <button type="button" class="mt-6 font-bold text-ink-muted hover:text-coral" @click="signOut">Sign out</button>
        </template>
      </div>
    </div>
  </div>
</template>
