<script setup lang="ts">
import { Mail, PartyPopper } from '@lucide/vue'

const email = ref('')
const subscribed = ref(false)

function onSubmit() {
  if (!email.value.trim()) return
  subscribed.value = true
  email.value = ''
}
</script>

<template>
  <div class="flex h-full flex-col justify-between rounded-3xl bg-navy p-8 text-cream shadow-warm">
    <div>
      <h3 class="mb-2 flex items-center gap-2 font-heading text-2xl font-bold">Stay Inspired <Mail class="h-6 w-6" /></h3>
      <p class="text-cream/80">
        Get a new short story in your inbox every week — sweet, gentle reads for bedtime or storytime.
      </p>
    </div>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-90"
      enter-to-class="opacity-100 scale-100"
      mode="out-in"
    >
      <p v-if="subscribed" class="mt-6 flex items-center gap-2 font-bold text-green-200">
        <PartyPopper class="h-5 w-5 animate-pop-heart" /> You're subscribed — welcome to Kidstory!
      </p>
      <form v-else class="mt-6 flex flex-col gap-3 sm:flex-row" @submit.prevent="onSubmit">
        <label class="flex-1">
          <span class="sr-only">Email address</span>
          <input
            v-model="email"
            type="email"
            required
            placeholder="Your email address"
            class="w-full rounded-full border-none px-4 py-3 text-navy outline-none ring-2 ring-transparent focus:ring-coral"
          />
        </label>
        <UiButton type="submit" variant="primary" class="justify-center !bg-coral hover:!bg-white hover:!text-coral">
          Subscribe
        </UiButton>
      </form>
    </Transition>
    <p class="mt-3 text-xs text-cream/60">Join thousands of families reading together every week.</p>
  </div>
</template>
