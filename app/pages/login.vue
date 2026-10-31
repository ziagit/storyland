<script setup lang="ts">
import { LogIn, Wand2 } from '@lucide/vue'

useSeoMeta({
  title: 'Sign in',
  robots: 'noindex, nofollow'
})

const route = useRoute()
const { user, ready, signInWithPassword, sendPasswordReset, signOut } = useAuth()

const nextPath = typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/admin'

const email = ref('')
const password = ref('')
const signingIn = ref(false)
const error = ref(route.query.denied ? "This account doesn't have studio access." : '')
const resetSent = ref(false)

async function onSubmit() {
  if (!email.value.trim() || !password.value || signingIn.value) return
  signingIn.value = true
  error.value = ''
  resetSent.value = false
  const res = await signInWithPassword(email.value.trim(), password.value)
  signingIn.value = false
  if (res.error) {
    error.value = res.error
    return
  }
  password.value = ''
  await navigateTo(nextPath)
}

async function onForgot() {
  error.value = ''
  resetSent.value = false
  if (!email.value.trim()) {
    error.value = 'Enter your email first, then click "Forgot password?".'
    return
  }
  const res = await sendPasswordReset(email.value.trim())
  if (res.error) error.value = res.error
  else resetSent.value = true
}
</script>

<template>
  <div class="px-4 py-16 sm:px-6">
    <div class="mx-auto max-w-md">
      <div class="rounded-3xl bg-white p-8 text-center shadow-warm">
        <span class="mb-3 inline-flex items-center gap-2 rounded-full bg-tan px-4 py-1.5 text-sm font-bold text-green">
          <Wand2 class="h-4 w-4" /> Kidstory Admin
        </span>
        <h1 class="font-heading text-3xl font-bold text-navy">Sign in</h1>

        <p v-if="!ready" class="mt-4 text-ink-muted">Loading…</p>

        <template v-else-if="user && !route.query.denied">
          <p class="mt-3 text-ink-muted">Signed in as <span class="font-bold text-navy">{{ user.email }}</span></p>
          <UiButton :to="nextPath" variant="primary" class="mt-6 w-full justify-center">Open Admin</UiButton>
          <button type="button" class="mt-4 font-bold text-ink-muted hover:text-coral" @click="signOut">Sign out</button>
        </template>

        <template v-else>
          <p class="mt-3 text-ink-muted">Enter your email and password to open the admin panel.</p>
          <form class="mt-6 flex flex-col gap-3 text-left" @submit.prevent="onSubmit">
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="you@example.com"
              class="rounded-full border-2 border-navy/15 px-5 py-3 text-navy outline-none focus:border-green"
            />
            <input
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="Password"
              class="rounded-full border-2 border-navy/15 px-5 py-3 text-navy outline-none focus:border-green"
            />
            <UiButton type="submit" variant="primary" class="justify-center" :class="{ 'pointer-events-none opacity-60': signingIn }">
              <LogIn class="h-4 w-4" />
              {{ signingIn ? 'Signing in…' : 'Sign in' }}
            </UiButton>
          </form>
          <button type="button" class="mt-4 text-sm font-bold text-ink-muted hover:text-coral" @click="onForgot">
            Forgot password?
          </button>
          <p v-if="resetSent" class="mt-4 font-bold text-green">Check your inbox for a link to set a new password.</p>
          <p v-if="error" class="mt-4 font-bold text-coral">{{ error }}</p>
          <button v-if="user && route.query.denied" type="button" class="mt-4 block w-full text-sm font-bold text-ink-muted hover:text-coral" @click="signOut">
            Sign out of {{ user.email }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
