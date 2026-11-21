<script setup lang="ts">
import { Sparkles, Send, Loader2, Wand2, CircleCheck, CircleAlert, MessageCircle, Mic, Square, Pause, Play, AudioLines } from '@lucide/vue'
import type { OrbState } from '~/components/VoiceOrb.vue'
import { categories } from '~/data/categories'

definePageMeta({ layout: 'admin' })

const adminFetch = useAdminApi()

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
// The story agent's own history for the current draft, so revisions keep their context.
const storyHistory = ref<ChatMessage[]>([])
const currentDraft = ref<StoryDraft | null>(null)

// The right panel has two tabs on one conversation: Chat (typed) and Voice, a
// separate voice agent with an animated orb. In Voice, replies are spoken and can be
// interrupted ("stop", "pause", "continue", or a new request).
const tab = ref<'chat' | 'voice'>('chat')
const voiceOn = computed(() => tab.value === 'voice')
// Google's voice and speech recognition; it stops and closes the mic when the tab changes.
const voice = useStudioVoice((text) => ask(text), () => voiceOn.value)
const voiceReady = voice.ready
// Whether the draft itself is being read aloud.
const reading = ref(false)
watch(voice.speaking, (speaking) => {
  if (!speaking) reading.value = false
})

const orbState = computed<OrbState>(() => {
  if (voice.listening.value) return 'listening'
  if (voice.transcribing.value || generating.value || publishing.value || deleting.value) return 'thinking'
  if (voice.speaking.value) return voice.paused.value ? 'paused' : 'speaking'
  return 'idle'
})

const voiceStatus = computed(() => {
  if (voice.listening.value) return 'Listening…'
  if (publishing.value) return 'Publishing…'
  if (deleting.value) return 'Deleting…'
  if (voice.transcribing.value || generating.value) return 'Thinking…'
  if (voice.speaking.value && voice.paused.value) return 'Paused'
  if (reading.value) return 'Reading'
  if (voice.speaking.value) return 'Speaking'
  return 'Tap to talk'
})


const generating = ref(false)
const publishing = ref(false)
const deleting = ref(false)
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

// Replies as they're read aloud: no markdown or emoji.
function spoken(text: string): string {
  return text.replace(/[*_#`]/g, '').replace(/\p{Extended_Pictographic}/gu, '')
}

function reply(text: string, draft?: StoryDraft) {
  entries.value.push({ role: 'assistant', text, draft })
  scrollChatToBottom()
  if (voiceOn.value) voice.say([spoken(text)])
}

async function ask(promptText: string) {
  if (!promptText.trim() || generating.value) return
  error.value = ''
  entries.value.push({ role: 'user', text: promptText })
  generating.value = true
  scrollChatToBottom()

  try {
    // The assistant talks ideas through, has the story agent write the first draft and
    // revise it on follow-ups, and asks for the draft to be read aloud or published.
    // The category/age selects only apply until there's a draft (they're hidden after).
    const hasDraft = currentDraft.value !== null
    const res = await adminFetch<{
      reply: string
      draft: StoryDraft | null
      action: 'read' | 'publish' | 'delete' | null
      target: { slug: string; title: string } | null
      history: ChatMessage[]
      storyHistory: ChatMessage[]
    }>('/api/studio/assistant', {
      method: 'POST',
      body: {
        message: promptText,
        history: apiHistory.value,
        draft: currentDraft.value,
        storyHistory: storyHistory.value,
        category: (!hasDraft && category.value) || undefined,
        ageRange: (!hasDraft && ageRange.value) || undefined,
        voice: voiceOn.value
      }
    })
    apiHistory.value = res.history
    storyHistory.value = res.storyHistory
    const changed = res.draft && JSON.stringify(res.draft) !== JSON.stringify(currentDraft.value)
    if (changed) {
      currentDraft.value = res.draft
      publishedSlug.value = ''
    }
    entries.value.push({ role: 'assistant', text: res.reply, draft: changed ? res.draft! : undefined })
    scrollChatToBottom()

    if (res.action === 'read' && currentDraft.value) {
      // Reading is the voice agent's job: asked for in the chat, it moves to the Voice tab.
      tab.value = 'voice'
      reading.value = true
      voice.say([spoken(res.reply), currentDraft.value.title, ...currentDraft.value.body])
    } else if (res.action === 'publish') {
      // publish() says how it went.
      await publish()
    } else if (res.action === 'delete' && res.target) {
      await deleteStory(res.target)
    } else if (voiceOn.value) {
      voice.say([spoken(res.reply)])
    }
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Something went wrong talking to the AI.'
    if (voiceOn.value) voice.say(["Sorry, that didn't work. Please try again."])
  } finally {
    generating.value = false
    scrollChatToBottom()
  }
}

function onSend() {
  const t = message.value
  message.value = ''
  ask(t)
}

// The orb and the mic button: tap to talk, tap again when done. Tapping while the
// agent speaks cuts it off and listens.
function talk() {
  if (generating.value || publishing.value || deleting.value) return
  error.value = ''
  voice.talk()
}

async function publish() {
  if (!currentDraft.value || publishing.value) return
  publishing.value = true
  error.value = ''
  const title = currentDraft.value.title
  try {
    const res = await adminFetch<{ slug: string }>('/api/studio/publish', {
      method: 'POST',
      body: currentDraft.value
    })
    publishedSlug.value = res.slug
    reply(`Published! ${title} is live on the site.`)
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Publishing failed.'
    reply(`Publishing ${title} didn't work: ${error.value}`)
  } finally {
    publishing.value = false
  }
}

// A published story the owner asked the assistant to delete (and confirmed).
async function deleteStory(target: { slug: string; title: string }) {
  deleting.value = true
  try {
    await adminFetch(`/api/admin/stories/${encodeURIComponent(target.slug)}`, { method: 'DELETE' })
    if (publishedSlug.value === target.slug) publishedSlug.value = ''
    reply(`Deleted. ${target.title} is no longer on the site.`)
  } catch (err: any) {
    const why = err?.data?.statusMessage || err?.message || 'Deleting failed.'
    error.value = why
    reply(`Deleting ${target.title} didn't work: ${why}`)
  } finally {
    deleting.value = false
  }
}

function startNewStory() {
  voice.stopSpeaking()
  entries.value = []
  apiHistory.value = []
  storyHistory.value = []
  currentDraft.value = null
  publishedSlug.value = ''
  error.value = ''
  message.value = ''
}
</script>

<template>
  <div class="mx-auto flex h-[calc(100dvh-100px)] max-w-7xl flex-col overflow-hidden px-4 py-4 sm:px-6 lg:h-screen lg:py-6">
    <div class="mb-4 shrink-0 text-center" :class="tab === 'voice' ? 'hidden lg:block' : ''">
      <span class="mb-2 inline-flex items-center gap-2 rounded-full bg-tan px-4 py-1.5 text-sm font-bold text-green">
        <Wand2 class="h-4 w-4" /> Story Studio
      </span>
      <h1 class="font-heading text-2xl font-extrabold text-navy sm:text-3xl">Write a story with AI</h1>
      <p class="mt-2 text-sm text-ink-muted">Chat on the right, watch the story take shape on the left.</p>
    </div>

    <!-- Stacked on small screens: the voice agent gets most of the height when open. -->
    <div
      class="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[1fr_400px] lg:grid-rows-1 lg:gap-6"
      :class="tab === 'voice' ? 'grid-rows-[minmax(0,1.7fr)_minmax(0,1fr)]' : 'grid-rows-[1fr_1fr]'"
    >
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
              <UiButton :to="`/stories/${publishedSlug}`" variant="primary" target="_blank">Read it →</UiButton>
              <UiButton :to="`/admin/stories/${publishedSlug}`" variant="secondary">Edit</UiButton>
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

      <!-- Right: the assistant, as a chat or as a voice agent -->
      <aside class="order-1 flex min-h-0 lg:order-2">
        <div class="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl bg-white shadow-warm">
          <div class="flex shrink-0 items-center gap-1 border-b border-tan/60 p-2" role="tablist" aria-label="Studio assistant">
            <button
              type="button"
              role="tab"
              :aria-selected="tab === 'chat'"
              class="flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition-colors"
              :class="tab === 'chat' ? 'bg-tan/50 text-navy' : 'text-ink-muted hover:text-navy'"
              @click="tab = 'chat'"
            >
              <MessageCircle class="h-4 w-4" /> Chat
            </button>
            <button
              v-if="voiceReady"
              type="button"
              role="tab"
              :aria-selected="tab === 'voice'"
              class="flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition-colors"
              :class="tab === 'voice' ? 'bg-coral text-white' : 'text-ink-muted hover:text-navy'"
              @click="tab = 'voice'"
            >
              <AudioLines class="h-4 w-4" /> Voice
            </button>
          </div>

          <!-- Chat -->
          <template v-if="tab === 'chat'">
            <div ref="chatLog" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <p v-if="!entries.length" class="text-sm text-ink-muted">
                Ask for story ideas, describe a story to write ("a shy hedgehog who learns to make friends at a new
                pond"), ask for changes, then say "publish it". Prefer talking? Open the Voice tab.
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
                <Loader2 class="h-3.5 w-3.5 animate-spin" /> Thinking… (writing a story takes about a minute)
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
                  :placeholder="entries.length ? 'Ask for a change…' : 'Ask for ideas or give it a topic…'"
                  class="min-w-0 flex-1 rounded-full border-2 border-tan bg-white px-4 py-2 text-sm outline-none transition-colors focus:border-coral"
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
          </template>

          <!-- Voice: a separate agent with the orb at its centre -->
          <template v-else>
            <div
              class="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto bg-gradient-to-b from-cream/60 to-white px-6 py-4 text-center sm:gap-5 sm:py-6 [&>*:first-child]:mt-auto [&>*:last-child]:mb-auto"
            >
              <button
                type="button"
                class="rounded-full outline-none transition-transform focus-visible:ring-4 focus-visible:ring-coral/30 active:scale-95"
                :aria-label="voice.listening.value ? 'Done talking' : 'Talk to the assistant'"
                @click="talk"
              >
                <VoiceOrb :state="orbState" :level="voice.level.value" />
              </button>

              <p class="font-heading text-lg font-bold text-navy" aria-live="polite">{{ voiceStatus }}</p>

              <p v-if="voice.error.value || error" class="text-sm font-semibold text-coral">{{ voice.error.value || error }}</p>
            </div>

            <!-- Controls -->
            <div class="flex shrink-0 items-center justify-center gap-5 border-t border-tan/60 px-4 py-4">
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-full bg-tan/50 text-navy transition-colors hover:bg-tan disabled:opacity-30"
                :disabled="!voice.speaking.value"
                :aria-label="voice.paused.value ? 'Resume' : 'Pause'"
                @click="voice.togglePause"
              >
                <Play v-if="voice.paused.value" class="h-5 w-5" />
                <Pause v-else class="h-5 w-5" />
              </button>
              <button
                type="button"
                class="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-warm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                :class="voice.listening.value ? 'bg-navy' : 'bg-coral'"
                :disabled="generating || publishing"
                :aria-label="voice.listening.value ? 'Done talking' : 'Talk'"
                @click="talk"
              >
                <Square v-if="voice.listening.value" class="h-6 w-6" />
                <Mic v-else class="h-7 w-7" />
              </button>
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-full bg-tan/50 text-navy transition-colors hover:bg-tan disabled:opacity-30"
                :disabled="!voice.speaking.value"
                aria-label="Stop"
                @click="voice.stopSpeaking"
              >
                <Square class="h-5 w-5" />
              </button>
            </div>
          </template>
        </div>
      </aside>
    </div>
  </div>
</template>
