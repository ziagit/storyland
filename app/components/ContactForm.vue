<script setup lang="ts">
import { MailOpen, Send } from '@lucide/vue'

const form = reactive({ name: '', email: '', message: '' })
const errors = reactive({ name: '', email: '', message: '' })
const submitted = ref(false)

function validate() {
  errors.name = form.name.trim() ? '' : 'Please tell us your name.'
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : 'Please enter a valid email.'
  errors.message = form.message.trim().length >= 10 ? '' : 'Message should be at least 10 characters.'
  return !errors.name && !errors.email && !errors.message
}

function onSubmit() {
  if (!validate()) return
  submitted.value = true
  form.name = ''
  form.email = ''
  form.message = ''
}
</script>

<template>
  <div>
    <Transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="opacity-0 scale-90"
      enter-to-class="opacity-100 scale-100"
    >
      <div
        v-if="submitted"
        class="flex flex-col items-center gap-3 rounded-3xl bg-green/10 px-6 py-12 text-center"
      >
        <MailOpen class="h-14 w-14 animate-pop-heart text-coral" :stroke-width="1.5" />
        <h3 class="font-heading text-2xl font-bold text-navy">Message sent!</h3>
        <p class="text-ink-muted">Thanks for writing to us — we'll get back to you very soon.</p>
        <UiButton variant="secondary" @click="submitted = false">Send another message</UiButton>
      </div>
    </Transition>

    <form v-if="!submitted" novalidate class="space-y-5" @submit.prevent="onSubmit">
      <div>
        <label for="name" class="mb-1 block text-sm font-bold text-navy">Your name</label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          class="w-full rounded-2xl border-2 bg-white px-4 py-3 outline-none transition-colors focus:border-coral"
          :class="errors.name ? 'border-coral' : 'border-tan'"
        />
        <p v-if="errors.name" class="mt-1 text-sm text-coral">{{ errors.name }}</p>
      </div>

      <div>
        <label for="email" class="mb-1 block text-sm font-bold text-navy">Email address</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          class="w-full rounded-2xl border-2 bg-white px-4 py-3 outline-none transition-colors focus:border-coral"
          :class="errors.email ? 'border-coral' : 'border-tan'"
        />
        <p v-if="errors.email" class="mt-1 text-sm text-coral">{{ errors.email }}</p>
      </div>

      <div>
        <label for="message" class="mb-1 block text-sm font-bold text-navy">Message</label>
        <textarea
          id="message"
          v-model="form.message"
          rows="5"
          class="w-full rounded-2xl border-2 bg-white px-4 py-3 outline-none transition-colors focus:border-coral"
          :class="errors.message ? 'border-coral' : 'border-tan'"
        />
        <p v-if="errors.message" class="mt-1 text-sm text-coral">{{ errors.message }}</p>
      </div>

      <UiButton type="submit" variant="primary" class="w-full justify-center">
        Send Message
        <Send class="h-4 w-4" />
      </UiButton>
    </form>
  </div>
</template>
