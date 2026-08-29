<script setup lang="ts">
import { Lock, ShieldCheck } from '@lucide/vue'
import type { Stripe, StripeElements } from '@stripe/stripe-js'

useSeoMeta({
  title: 'Checkout',
  description: 'Unlock every story on Kidstory with a one-time payment.'
})

const config = useRuntimeConfig()
const { user, accessToken, hasAccess, ready, refreshAccessStatus } = useAuth()

const mountEl = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'ready' | 'paying' | 'success' | 'error'>('loading')
const errorMessage = ref('')
const cardholderName = ref('')

let stripe: Stripe | null = null
let elements: StripeElements | null = null

async function setup() {
  if (!ready.value || status.value !== 'loading') return
  if (!user.value) {
    navigateTo('/account?next=/checkout')
    return
  }
  if (hasAccess.value) {
    status.value = 'success'
    return
  }

  try {
    const { clientSecret } = await $fetch<{ clientSecret: string }>('/api/checkout/create-intent', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })

    const { loadStripe } = await import('@stripe/stripe-js')
    stripe = await loadStripe(config.public.stripePublishableKey as string, {
      // Stripe's test-mode "developer tools" assistant (a floating button, bottom-right
      // of the page) is only meant to help while integrating — it clutters our own
      // branded page, so it's turned off explicitly rather than left to show by default.
      developerTools: { assistant: { enabled: false } }
    })
    if (!stripe) {
      throw new Error('Stripe failed to load.')
    }

    elements = stripe.elements({
      clientSecret,
      // Stripe's Payment Element renders in a sandboxed iframe, so it needs its own
      // copy of the site's font rather than inheriting it from the page.
      fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap' }],
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#2F6F58',
          colorBackground: '#ffffff',
          colorText: '#1B3B5F',
          colorDanger: '#E36656',
          fontFamily: 'Nunito, ui-sans-serif, sans-serif',
          borderRadius: '16px'
        }
      }
    })

    elements.create('payment', {
      // We collect the cardholder's name ourselves (above the Element, styled as
      // "Name on card") instead of Stripe's own billing-details block, don't need
      // phone or address (country/postal) for a $9.99 digital-good purchase, and
      // already show the signed-in reader's email above the form — no need for
      // Stripe's own (optional) email field on top of that.
      fields: {
        billingDetails: {
          name: 'never',
          email: 'never',
          phone: 'never',
          address: 'never'
        }
      }
    }).mount(mountEl.value!)
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof Error ? err.message : 'Could not start checkout.'
  }
}

watch(ready, setup, { immediate: true })

async function pay() {
  if (!stripe || !elements) return
  if (!cardholderName.value.trim()) {
    errorMessage.value = 'Please enter the name on your card.'
    return
  }
  status.value = 'paying'
  errorMessage.value = ''

  try {
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/account?checkout=success`,
        payment_method_data: {
          billing_details: {
            name: cardholderName.value.trim(),
            email: user.value?.email ?? undefined,
            // Stripe requires every field opted out of via the Payment Element's
            // `fields.billingDetails: 'never'` to be explicitly supplied here instead —
            // we don't collect phone or a real address at all, so these are fixed
            // placeholders rather than actual customer data (never shown to the buyer).
            phone: '',
            // Stripe's client-side check enumerates every address sub-field once the
            // whole `address` block is opted out via 'never' (country, then postal_code,
            // then line1/line2/city/state — confirmed by hitting each one in turn), so
            // all of them need to be present here, not just the ones seen failing so far.
            address: {
              line1: '',
              line2: '',
              city: '',
              state: '',
              postal_code: '00000',
              country: 'US'
            }
          }
        }
      },
      redirect: 'if_required'
    })

    if (error) {
      errorMessage.value = error.message ?? 'Payment failed. Please try again.'
      status.value = 'ready'
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      await refreshAccessStatus()
      status.value = 'success'
      return
    }

    // No error, but not succeeded either (e.g. requires_action, requires_payment_method,
    // or still processing) — without this, the button was silently stuck on "Processing…"
    // forever whenever confirmPayment resolved into anything other than those two cases.
    errorMessage.value = 'Payment did not complete. Please check your card details and try again.'
    status.value = 'ready'
  } catch (err) {
    // A rejected promise here (e.g. a dropped connection to Stripe) had the same
    // silent-hang effect as the missing branch above — this catches it too.
    errorMessage.value = err instanceof Error ? err.message : 'Something went wrong while processing your payment.'
    status.value = 'ready'
  }
}
</script>

<template>
  <div class="px-4 py-16 sm:px-6">
    <div class="mx-auto max-w-lg">
      <div class="rounded-3xl bg-white p-8 shadow-warm" v-reveal>
        <div class="text-center">
          <h1 class="font-heading text-3xl font-bold text-navy">Unlock All Stories</h1>
          <p class="mt-2 text-ink-muted">One-time payment. Every story, forever.</p>
        </div>

        <div v-if="status === 'success'" class="mt-8 rounded-2xl bg-green/10 p-6 text-center">
          <ShieldCheck class="mx-auto h-9 w-9 text-green" />
          <p class="mt-2 font-bold text-navy">You're all set!</p>
          <p class="text-sm text-ink-muted">Full access is unlocked on your account.</p>
          <UiButton to="/stories" variant="primary" class="mt-5 justify-center">Start Reading</UiButton>
        </div>

        <template v-else>
          <div class="mt-6 flex items-center justify-between rounded-2xl bg-tan/50 px-5 py-4">
            <span class="font-bold text-navy">Kidstory Full Access</span>
            <span class="font-heading text-xl font-bold text-navy">$9.99</span>
          </div>

          <p v-if="user" class="mt-3 text-center text-sm text-ink-muted">
            Unlocking for <span class="font-bold text-navy">{{ user.email }}</span> — sign in with this email anytime to read every story.
          </p>

          <p v-if="status === 'loading'" class="mt-8 text-center text-ink-muted">Loading secure payment form…</p>

          <form class="mt-6" @submit.prevent="pay">
            <label class="block">
              <span class="mb-1.5 block text-sm font-bold text-navy">Name on card</span>
              <input
                v-model="cardholderName"
                type="text"
                autocomplete="cc-name"
                required
                placeholder="Name on card"
                class="w-full rounded-full border-2 border-navy/15 px-5 py-3 text-navy outline-none focus:border-green"
              />
            </label>
            <div ref="mountEl" class="mt-5" />
            <UiButton
              type="submit"
              variant="primary"
              class="mt-6 w-full justify-center"
              :class="{ 'pointer-events-none opacity-60': status !== 'ready' }"
            >
              {{ status === 'paying' ? 'Processing…' : 'Pay $9.99' }}
            </UiButton>
          </form>

          <p v-if="errorMessage" class="mt-4 text-center font-bold text-coral">{{ errorMessage }}</p>

          <p class="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
            <Lock class="h-3.5 w-3.5" />
            Payments are securely processed by Stripe.
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
