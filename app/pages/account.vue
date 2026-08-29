<script setup lang="ts">
import { Mail, CheckCircle2, Lock } from '@lucide/vue'

useSeoMeta({
  title: 'Account',
  description: 'Sign in to Kidstory and unlock every story with a one-time purchase.'
})

const route = useRoute()
const { user, hasAccess, ready, signInWithOtp, signOut, refreshAccessStatus } = useAuth()

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

// Coming back from Stripe: the webhook that grants access lands asynchronously,
// so poll briefly rather than trusting the redirect alone.
if (import.meta.client && route.query.checkout === 'success') {
  let attempts = 0
  const poll = setInterval(async () => {
    attempts += 1
    await refreshAccessStatus()
    if (hasAccess.value || attempts >= 6) {
      clearInterval(poll)
    }
  }, 2000)
}
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

          <div v-if="hasAccess" class="mt-6 rounded-2xl bg-green/10 p-5">
            <CheckCircle2 class="mx-auto h-8 w-8 text-green" />
            <p class="mt-2 font-bold text-navy">Full access unlocked!</p>
            <p class="text-sm text-ink-muted">Every story on Kidstory is yours to read, forever.</p>
          </div>

          <div v-else class="mt-6 rounded-2xl bg-tan/60 p-5">
            <Lock class="mx-auto h-8 w-8 text-navy" />
            <p class="mt-2 font-bold text-navy">You're on the free tier</p>
            <p class="text-sm text-ink-muted">A handful of stories are free — unlock the rest with a one-time payment.</p>
            <UiButton to="/checkout" variant="primary" class="mt-4 w-full justify-center">
              Unlock All Stories — $9.99
            </UiButton>
          </div>

          <button type="button" class="mt-6 font-bold text-ink-muted hover:text-coral" @click="signOut">Sign out</button>
        </template>
      </div>
    </div>
  </div>
</template>
