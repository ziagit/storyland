<script setup lang="ts">
import { Hand, Camera, Users, Video } from '@lucide/vue'

useSeoMeta({
  title: 'Contact',
  description: 'Say hello to the Kidstory team — questions, story suggestions, and feedback are always welcome.'
})

const socials = [Camera, Users, Video]

const faqs = [
  {
    q: 'Can I suggest a story idea?',
    a: 'Absolutely! We love hearing story ideas from kids and parents. Send us a message below.'
  },
  {
    q: 'Are the stories free to read?',
    a: 'Yes — every story on Kidstory is free to read, anytime, on any device.'
  },
  {
    q: 'What ages are the stories for?',
    a: 'Most stories suit ages 3–12, and each one is tagged with a recommended age range.'
  }
]
</script>

<template>
  <div class="px-4 py-14 sm:px-6">
    <div class="mx-auto max-w-3xl text-center" v-reveal>
      <h1 class="flex items-center justify-center gap-2 font-heading text-4xl font-extrabold text-navy sm:text-5xl">
        Say Hello <Hand class="h-9 w-9 text-coral" />
      </h1>
      <p class="mt-4 text-lg text-ink-muted">
        Got a story idea, a kind word, or a question? We'd love to hear from you — and from your kids, too.
      </p>
    </div>

    <div class="mx-auto mt-12 grid max-w-5xl gap-10 md:grid-cols-2">
      <div class="rounded-3xl bg-white p-8 shadow-warm" v-reveal>
        <ContactForm />
      </div>

      <div class="space-y-8" v-reveal>
        <div>
          <h2 class="mb-4 font-heading text-xl font-bold text-navy">Quick Questions</h2>
          <div class="space-y-4">
            <div v-for="faq in faqs" :key="faq.q" class="rounded-2xl bg-tan/40 p-4">
              <p class="font-bold text-navy">{{ faq.q }}</p>
              <p class="mt-1 text-sm text-ink-muted">{{ faq.a }}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 class="mb-4 font-heading text-xl font-bold text-navy">Find Us Elsewhere</h2>
          <div class="flex gap-3">
            <a
              v-for="(social, i) in socials"
              :key="i"
              href="#"
              class="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-warm transition-transform hover:-translate-y-0.5"
            >
              <component :is="social" class="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
