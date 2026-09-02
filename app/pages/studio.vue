<script setup lang="ts">
import { Sparkles, Send, Loader2, Wand2, CircleCheck, MessageCircle } from '@lucide/vue'
import { categories } from '~/data/categories'

useSeoMeta({
  title: 'Studio',
  robots: 'noindex, nofollow'
})

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface StoryDraft {
  title: string
  emoji: string
  excerpt: string
  category: string
  ageRange: string
  readTimeMinutes: number
  tags: string[]
  body: string[]
}

interface ChatEntry {
  role: 'user' | 'assistant'
  text?: string
  draft?: StoryDraft
}

const ageOptions = [
  { value: '', label: 'Let it decide' },
  { value: '3-5', label: 'Ages 3–5' },
  { value: '6-8', label: 'Ages 6–8' },
  { value: '9-12', label: 'Ages 9–12' },
  { value: 'all-ages', label: 'All Ages' }
]

const message = ref('')
const category = ref('')
const ageRange = ref('')

const entries = ref<ChatEntry[]>([])
const apiHistory = ref<ChatMessage[]>([])
const currentDraft = ref<StoryDraft | null>(null)

const generating = ref(false)
const publishing = ref(false)
const error = ref('')
const publishedSlug = ref('')

const chatLog = ref<HTMLElement | null>(null)
function scrollChatToBottom() {
  nextTick(() => {
    chatLog.value?.scrollTo({ top: chatLog.value.scrollHeight, behavior: 'smooth' })
  })
}

const categoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug
const ageLabel = (value: string) => ageOptions.find((a) => a.value === value)?.label ?? value

async function generate(promptText: string) {
  if (!promptText.trim() || generating.value) return
  const isFirst = entries.value.length === 0
  error.value = ''
  publishedSlug.value = ''
  entries.value.push({ role: 'user', text: promptText })
  generating.value = true
  scrollChatToBottom()

  try {
    const res = await $fetch<{ draft: StoryDraft; history: ChatMessage[] }>('/api/studio/generate', {
      method: 'POST',
      body: {
        topic: promptText,
        category: category.value || undefined,
        ageRange: ageRange.value || undefined,
        history: apiHistory.value
      }
    })
    currentDraft.value = res.draft
    apiHistory.value = res.history
    entries.value.push({
      role: 'assistant',
      text: isFirst ? "Here's your first draft — check it out on the left!" : 'Updated — take a look on the left!',
      draft: res.draft
    })
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Something went wrong talking to the AI.'
  } finally {
    generating.value = false
    scrollChatToBottom()
  }
}

function onSend() {
  const t = message.value
  message.value = ''
  generate(t)
}

async function publish() {
  if (!currentDraft.value || publishing.value) return
  publishing.value = true
  error.value = ''
  try {
    const res = await $fetch<{ slug: string }>('/api/studio/publish', {
      method: 'POST',
      body: currentDraft.value
    })
    publishedSlug.value = res.slug
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Publishing failed.'
  } finally {
    publishing.value = false
  }
}

function startNewStory() {
  entries.value = []
  apiHistory.value = []
  currentDraft.value = null
  publishedSlug.value = ''
  error.value = ''
  message.value = ''
}
</script>

<template>
  <div class="mx-auto flex h-[calc(100dvh-65px)] max-w-7xl flex-col overflow-hidden px-4 py-4 sm:px-6">
    <div class="mb-4 shrink-0 text-center">
      <span class="mb-2 inline-flex items-center gap-2 rounded-full bg-tan px-4 py-1.5 text-sm font-bold text-green">
        <Wand2 class="h-4 w-4" /> Story Studio
      </span>
      <h1 class="font-heading text-2xl font-extrabold text-navy sm:text-3xl">Write a story with AI</h1>
      <p class="mt-2 text-sm text-ink-muted">Chat on the right, watch the story take shape on the left.</p>
    </div>

    <div class="grid min-h-0 flex-1 grid-rows-[1fr_1fr] gap-4 overflow-hidden lg:grid-cols-[1fr_400px] lg:grid-rows-1 lg:gap-6">
      <!-- Left: draft preview / published result -->
      <div class="order-2 min-h-0 min-w-0 overflow-y-auto lg:order-1">
        <div
          v-if="!currentDraft"
          class="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-tan bg-white/50 p-10 text-center"
        >
          <Sparkles class="h-10 w-10 text-tan" />
          <p class="font-bold text-navy">Your story will appear here</p>
          <p class="max-w-xs text-sm text-ink-muted">Tell it a topic in the chat to get started.</p>
        </div>

        <template v-else>
          <div class="rounded-3xl bg-white p-6 shadow-warm sm:p-8">
            <div class="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-green">
              <span class="text-2xl leading-none">{{ currentDraft.emoji }}</span>
              <span class="rounded-full bg-tan px-3 py-1 text-navy">{{ categoryLabel(currentDraft.category) }}</span>
              <span class="rounded-full bg-green/15 px-3 py-1 text-green">{{ ageLabel(currentDraft.ageRange) }}</span>
              <span class="text-ink-muted">{{ currentDraft.readTimeMinutes }} min read</span>
            </div>
            <h2 class="font-heading text-2xl font-bold text-navy sm:text-3xl">{{ currentDraft.title }}</h2>
            <p class="mt-2 italic text-ink-muted">{{ currentDraft.excerpt }}</p>
            <div class="prose-story mt-4 space-y-3 leading-relaxed text-navy">
              <p v-for="(p, pi) in currentDraft.body" :key="pi">{{ p }}</p>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <TagPill v-for="tag in currentDraft.tags" :key="tag" :label="tag" />
            </div>
          </div>

          <div v-if="publishedSlug" class="mt-5 flex flex-col items-center gap-3 rounded-3xl bg-green/10 px-6 py-8 text-center">
            <CircleCheck class="h-10 w-10 text-green" />
            <p class="font-bold text-navy">Published!</p>
            <div class="flex flex-wrap justify-center gap-3">
              <UiButton :to="`/stories/${publishedSlug}`" variant="primary">Read it →</UiButton>
              <UiButton variant="secondary" @click="startNewStory">Write another</UiButton>
            </div>
          </div>
          <UiButton
            v-else
            type="button"
            variant="primary"
            class="mt-5 w-full justify-center"
            :disabled="publishing || generating"
            @click="publish"
          >
            <Loader2 v-if="publishing" class="h-4 w-4 animate-spin" />
            {{ publishing ? 'Publishing…' : 'Publish this story' }}
          </UiButton>
        </template>

        <p v-if="error" class="mt-4 flex items-center gap-2 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
          <CircleAlert class="h-4 w-4 shrink-0" /> {{ error }}
        </p>
      </div>

      <!-- Right: chat panel -->
      <aside class="order-1 flex min-h-0 lg:order-2">
        <div class="flex h-full min-h-0 w-full flex-col rounded-3xl bg-white shadow-warm">
          <div class="flex shrink-0 items-center gap-2 border-b border-tan/60 px-5 py-4">
            <MessageCircle class="h-5 w-5 text-green" />
            <p class="font-heading font-bold text-navy">Chat with the AI</p>
          </div>

          <div ref="chatLog" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <p v-if="!entries.length" class="text-sm text-ink-muted">
              Give it a topic to start, e.g. "a shy hedgehog who learns to make friends at a new pond".
            </p>

            <div v-for="(entry, i) in entries" :key="i">
              <div v-if="entry.role === 'user'" class="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-navy px-4 py-2.5 text-sm text-cream">
                {{ entry.text }}
              </div>
              <div v-else class="max-w-[90%] rounded-2xl rounded-tl-md bg-tan/40 px-4 py-2.5 text-sm text-navy">
                <p>{{ entry.text }}</p>
                <div v-if="entry.draft" class="mt-1.5 flex items-center gap-1.5 truncate text-xs font-bold text-green">
                  <span>{{ entry.draft.emoji }}</span>
                  <span class="truncate">{{ entry.draft.title }}</span>
                </div>
              </div>
            </div>

            <div v-if="generating" class="flex max-w-[90%] items-center gap-2 rounded-2xl rounded-tl-md bg-tan/40 px-4 py-2.5 text-sm text-ink-muted">
              <Loader2 class="h-3.5 w-3.5 animate-spin" /> Writing…
            </div>
          </div>

          <div class="shrink-0 space-y-2 border-t border-tan/60 p-3">
            <div v-if="!entries.length" class="grid grid-cols-2 gap-2">
              <select
                v-model="category"
                class="w-full rounded-full border-2 border-tan bg-white px-3 py-1.5 text-xs outline-none focus:border-coral"
              >
                <option value="">Any category</option>
                <option v-for="cat in categories" :key="cat.slug" :value="cat.slug">{{ cat.label }}</option>
              </select>
              <select
                v-model="ageRange"
                class="w-full rounded-full border-2 border-tan bg-white px-3 py-1.5 text-xs outline-none focus:border-coral"
              >
                <option v-for="a in ageOptions" :key="a.value" :value="a.value">{{ a.label }}</option>
              </select>
            </div>
            <form class="flex items-center gap-2" @submit.prevent="onSend">
              <input
                v-model="message"
                type="text"
                :placeholder="entries.length ? 'Ask for a change…' : 'Give it a topic…'"
                class="flex-1 rounded-full border-2 border-tan bg-white px-4 py-2 text-sm outline-none transition-colors focus:border-coral"
              />
              <button
                type="submit"
                :disabled="generating || !message.trim()"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green text-white transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send"
              >
                <Send class="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
