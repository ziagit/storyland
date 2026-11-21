<script setup lang="ts">
import { BookOpen, Keyboard, MessageCircle, Mic, Pause, Play, RotateCcw, Send, Square, Volume2, VolumeX, X } from '@lucide/vue'
import type { Story } from '../../shared/utils/kidstory-api'
import type { ChatMessage } from '../../shared/utils/story-authoring'

const GREETING = "Hi! I'm Kidstory's helper. Ask me about stories for your child or signing in."
const SUGGESTIONS = ['A bedtime story for age 4', "I can't sign in", 'Is it free?']
const HINT_KEY = 'kidstory-helper-hint-seen'
const AGE_LABEL: Record<string, string> = { '3-5': 'Ages 3–5', '6-8': 'Ages 6–8', '9-12': 'Ages 9–12', 'all-ages': 'All ages' }

const { accessToken } = useAuth()
const speech = useSpeech()
const open = ref(false)
// Voice where the browser can both listen and speak; the reader can switch either way.
const mode = ref<'voice' | 'text'>('text')
const voiceReady = computed(() => speech.canListen.value && speech.canSpeak.value)
const muted = ref(false)
const showHint = ref(false)
const draft = ref('')
const sending = ref(false)
const error = ref('')
// A spoken question that didn't get an answer, kept on screen so it can be retried.
const failed = ref('')
// The story being read aloud, if the reader asked the helper to read one.
const reading = ref<Story | null>(null)
// The conversation as the API returned it, sent back with each message. It lives
// in this component (mounted once in app.vue), so it survives page navigation.
const history = ref<ChatMessage[]>([])
// Stories the helper recommended or read, by slug; recommended ones show as cards under its replies.
const stories = ref<Record<string, Story>>({})
const scroller = ref<HTMLElement | null>(null)
const input = ref<HTMLTextAreaElement | null>(null)

// Site paths in a reply ("/stories/moonlight-friends", "/account") become links.
const PATH = /(\/(?:stories\/[a-z0-9-]+|stories|account|contact|about))(?=[\s.,;:!?)]|$)/g
// A story path in brackets after its title, as the helper writes them in voice mode.
const BRACKETED_STORY = /\s*\(\/stories\/([a-z0-9-]+)\)/g
const STORY_PATH = /\/stories\/([a-z0-9-]+)/g
// How other site paths are said out loud.
const SPOKEN_PATH: Record<string, string> = {
  '/stories': 'the Stories page',
  '/account': 'the Account page',
  '/contact': 'the Contact page',
  '/about': 'the About page'
}

function storySlugs(text: string): string[] {
  return [...new Set(Array.from(text.matchAll(STORY_PATH), (m) => m[1]))].slice(0, 3)
}

// A story's bracketed path is dropped once its card has loaded; the card links to it.
function shown(text: string): string {
  return text.replace(BRACKETED_STORY, (match, slug: string) => (stories.value[slug] ? '' : match))
}

function segments(text: string): { text: string; to?: string }[] {
  const parts: { text: string; to?: string }[] = []
  let last = 0
  for (const match of text.matchAll(PATH)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    parts.push({ text: match[1], to: match[1] })
    last = match.index + match[1].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

// The reply as it's read aloud: no paths, markdown or emoji.
function spoken(text: string): string {
  return text
    .replace(BRACKETED_STORY, '')
    .replace(STORY_PATH, 'the story below')
    .replace(PATH, (path) => SPOKEN_PATH[path] ?? path)
    .replace(/[*_#`]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
}

async function loadStory(slug: string): Promise<Story | null> {
  if (stories.value[slug]) return stories.value[slug]
  try {
    const story = await $fetch<Story>(`/api/stories/${slug}`)
    stories.value = { ...stories.value, [slug]: story }
    return story
  } catch {
    // No card; the reply still links to the story.
    return null
  }
}

async function loadStories(text: string) {
  for (const slug of storySlugs(text)) await loadStory(slug)
}

// A failed message, or the microphone not working.
const problem = computed(() => error.value || speech.error.value)

const lastReply = computed(() => [...history.value].reverse().find((m) => m.role === 'assistant')?.content ?? '')

const status = computed(() => {
  if (speech.listening.value) return 'Listening…'
  if (sending.value) return 'Thinking…'
  if (reading.value && speech.speaking.value) return speech.paused.value ? 'Paused' : 'Reading a story'
  if (speech.speaking.value) return speech.paused.value ? 'Paused' : 'Speaking'
  return mode.value === 'voice' ? 'Talk or type · a person follows up if needed' : 'Answers in seconds · a person follows up if needed'
})

// The story is done (or was stopped) once speech ends.
watch(speech.speaking, (speaking) => {
  if (!speaking) reading.value = null
})

onMounted(() => {
  if (voiceReady.value) mode.value = 'voice'
  try {
    if (!localStorage.getItem(HINT_KEY)) {
      showHint.value = true
      setTimeout(dismissHint, 8000)
    }
  } catch {
    // Storage blocked: skip the hint.
  }
})

function dismissHint() {
  showHint.value = false
  try {
    localStorage.setItem(HINT_KEY, '1')
  } catch {
    // Storage blocked: the hint may show again next visit.
  }
}

async function scrollToEnd() {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
}

async function focusInput() {
  await nextTick()
  input.value?.focus()
}

async function toggle() {
  open.value = !open.value
  dismissHint()
  if (open.value) {
    if (mode.value === 'text') focusInput()
    scrollToEnd()
  } else {
    speech.cancelListening()
    speech.stopSpeaking()
  }
}

function useText() {
  speech.cancelListening()
  speech.stopSpeaking()
  mode.value = 'text'
  focusInput()
}

function useVoice() {
  mode.value = 'voice'
  listen()
}

function listen() {
  error.value = ''
  speech.listen((text) => send(text))
}

async function send(text = draft.value) {
  const message = text.trim()
  if (!message || sending.value) return
  const voice = mode.value === 'voice'
  error.value = ''
  failed.value = ''
  sending.value = true
  const before = history.value
  history.value = [...before, { role: 'user', content: message }]
  if (!voice) draft.value = ''
  scrollToEnd()
  try {
    const res = await $fetch<{ reply: string; history: ChatMessage[]; readAloud?: string | null }>('/api/support/chat', {
      method: 'POST',
      body: { message, history: before, voice },
      headers: accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : undefined
    })
    history.value = res.history
    const story = res.readAloud ? await loadStory(res.readAloud) : null
    if (story && open.value && !muted.value) {
      // The reader asked to hear it, so it's read in text mode too: the reply, then the story.
      reading.value = story
      speech.speak([spoken(res.reply), ...story.body])
    } else if (voice && mode.value === 'voice' && open.value && !muted.value) {
      // Only speak if the reader is still in voice mode with the chat open.
      speech.speak(spoken(res.reply))
    }
    await loadStories(res.reply)
  } catch (err: any) {
    history.value = before
    if (voice) failed.value = message
    else draft.value = message
    error.value = err?.data?.statusMessage || err?.statusMessage || 'Something went wrong. Please try again.'
  } finally {
    sending.value = false
    scrollToEnd()
    if (mode.value === 'text') input.value?.focus()
  }
}

function toggleMute() {
  muted.value = !muted.value
  if (muted.value) speech.stopSpeaking()
}

function replay() {
  if (lastReply.value) speech.speak(spoken(lastReply.value))
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-3 scale-95"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0 translate-y-3 scale-95"
    >
      <section
        v-if="open"
        id="support-chat"
        aria-label="Kidstory help chat"
        class="flex h-[min(32rem,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-tan bg-cream shadow-warm-lg"
      >
        <header class="flex items-center justify-between gap-3 bg-navy px-5 py-4 text-white">
          <div>
            <p class="font-heading text-lg font-bold leading-tight">Kidstory Helper</p>
            <p class="text-xs text-white/70" aria-live="polite">{{ status }}</p>
          </div>
          <button
            type="button"
            class="rounded-full p-1.5 transition-colors hover:bg-white/15"
            aria-label="Close chat"
            @click="toggle"
          >
            <X class="h-5 w-5" />
          </button>
        </header>

        <!-- Voice: listening -->
        <div
          v-if="mode === 'voice' && speech.listening.value"
          class="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center"
        >
          <div class="relative h-24 w-24">
            <span class="absolute inset-0 animate-ping rounded-full bg-coral/30" />
            <span class="relative flex h-24 w-24 items-center justify-center rounded-full bg-coral text-white">
              <Mic class="h-10 w-10" />
            </span>
          </div>
          <p class="min-h-[3rem] font-heading text-lg leading-snug text-navy" aria-live="polite">
            <template v-if="speech.transcript.value">"{{ speech.transcript.value }}"</template>
            <span v-else class="text-ink-muted/70">Go ahead, I'm listening…</span>
          </p>
          <button
            type="button"
            class="flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-green"
            @click="speech.stopListening"
          >
            <Square class="h-3.5 w-3.5" /> Done
          </button>
        </div>

        <!-- Voice: ready to listen, before the first question -->
        <div
          v-else-if="mode === 'voice' && history.length === 0 && !sending && !failed"
          class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
        >
          <p class="font-heading text-xl text-navy">Hi! What can I help with?</p>
          <button
            type="button"
            class="flex h-24 w-24 items-center justify-center rounded-full bg-coral text-white shadow-warm transition-transform hover:-translate-y-0.5 hover:bg-navy active:scale-95"
            aria-label="Start talking"
            @click="listen"
          >
            <Mic class="h-10 w-10" />
          </button>
          <p class="text-sm text-ink-muted">Tap and ask your question</p>
          <div class="flex flex-wrap justify-center gap-2">
            <button
              v-for="s in SUGGESTIONS"
              :key="s"
              type="button"
              class="rounded-full border border-tan bg-white px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-coral"
              @click="send(s)"
            >
              {{ s }}
            </button>
          </div>
          <p v-if="problem" class="text-sm text-coral">{{ problem }}</p>
        </div>

        <!-- The conversation, in both modes -->
        <template v-else>
          <div ref="scroller" class="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            <p class="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-navy shadow-sm">
              {{ GREETING }}
            </p>
            <template v-for="(turn, i) in history" :key="i">
              <p
                class="max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm shadow-sm"
                :class="turn.role === 'user' ? 'ml-auto rounded-br-md bg-green text-white' : 'rounded-bl-md bg-white text-navy'"
              >
                <template v-for="(part, j) in segments(turn.role === 'assistant' ? shown(turn.content) : turn.content)" :key="j">
                  <NuxtLink v-if="part.to" :to="part.to" class="font-bold text-coral underline underline-offset-2">{{ part.text }}</NuxtLink>
                  <template v-else>{{ part.text }}</template>
                </template>
              </p>
              <template v-if="turn.role === 'assistant'">
                <template v-for="slug in storySlugs(turn.content)" :key="slug">
                  <NuxtLink
                    v-if="stories[slug]"
                    :to="`/stories/${slug}`"
                    class="flex max-w-[85%] items-center gap-3 rounded-2xl border border-tan bg-white p-2 shadow-sm transition-colors hover:border-coral"
                  >
                    <img
                      v-if="stories[slug].coverImageUrl"
                      :src="stories[slug].coverImageUrl!"
                      alt=""
                      class="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                    <span v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tan text-xl">{{ stories[slug].emoji }}</span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-heading text-sm font-bold text-navy">{{ stories[slug].title }}</span>
                      <span class="block text-xs text-ink-muted">{{ AGE_LABEL[stories[slug].ageRange] }} · {{ stories[slug].readTimeMinutes }} min read</span>
                    </span>
                    <span class="rounded-full bg-green px-3 py-1 text-xs font-bold text-white">Read</span>
                  </NuxtLink>
                </template>
              </template>
            </template>
            <div v-if="failed" class="ml-auto flex max-w-[85%] flex-col items-end gap-1.5">
              <p class="rounded-2xl rounded-br-md bg-green/60 px-4 py-2.5 text-sm text-white shadow-sm">{{ failed }}</p>
              <button
                type="button"
                class="flex items-center gap-1 text-xs font-bold text-coral transition-colors hover:text-navy"
                @click="send(failed)"
              >
                <RotateCcw class="h-3.5 w-3.5" /> Not sent. Try again
              </button>
            </div>
            <p v-if="sending" class="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm" aria-label="Helper is typing">
              <span class="h-2 w-2 animate-bounce rounded-full bg-ink-muted/60" />
              <span class="h-2 w-2 animate-bounce rounded-full bg-ink-muted/60 [animation-delay:150ms]" />
              <span class="h-2 w-2 animate-bounce rounded-full bg-ink-muted/60 [animation-delay:300ms]" />
            </p>
          </div>

          <p v-if="problem" class="px-4 pb-2 text-sm text-coral">{{ problem }}</p>
        </template>

        <!-- A story being read aloud -->
        <div
          v-if="reading && !speech.listening.value"
          class="flex items-center gap-3 border-t border-tan bg-cream px-4 py-2.5"
        >
          <img v-if="reading.coverImageUrl" :src="reading.coverImageUrl" alt="" class="h-10 w-10 shrink-0 rounded-lg object-cover" />
          <span v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tan text-lg">{{ reading.emoji }}</span>
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-green">
              <BookOpen class="h-3 w-3" /> {{ speech.paused.value ? 'Paused' : 'Reading aloud' }}
            </p>
            <NuxtLink :to="`/stories/${reading.slug}`" class="block truncate font-heading text-sm font-bold text-navy hover:text-coral">
              {{ reading.title }}
            </NuxtLink>
          </div>
          <button
            type="button"
            class="rounded-full p-2 text-navy transition-colors hover:bg-white"
            :aria-label="speech.paused.value ? 'Resume the story' : 'Pause the story'"
            @click="speech.togglePause"
          >
            <Play v-if="speech.paused.value" class="h-4 w-4" />
            <Pause v-else class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="rounded-full p-2 text-navy transition-colors hover:bg-white"
            aria-label="Stop reading"
            @click="speech.stopSpeaking"
          >
            <Square class="h-4 w-4" />
          </button>
        </div>

        <!-- Voice controls -->
        <div
          v-if="mode === 'voice' && !speech.listening.value"
          class="flex items-center justify-between gap-2 border-t border-tan bg-white px-4 py-3"
        >
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-navy"
            @click="useText"
          >
            <Keyboard class="h-4 w-4" /> Type instead
          </button>
          <div v-if="history.length" class="flex items-center gap-1">
            <div v-if="speech.speaking.value && !speech.paused.value" class="mr-1 flex h-5 items-center gap-0.5" aria-hidden="true">
              <span class="w-1 animate-sound-bar rounded-full bg-green" />
              <span class="w-1 animate-sound-bar rounded-full bg-green [animation-delay:150ms]" />
              <span class="w-1 animate-sound-bar rounded-full bg-green [animation-delay:300ms]" />
            </div>
            <button
              v-if="speech.speaking.value && !reading"
              type="button"
              class="rounded-full p-2 text-navy transition-colors hover:bg-cream"
              :aria-label="speech.paused.value ? 'Resume' : 'Pause'"
              @click="speech.togglePause"
            >
              <Play v-if="speech.paused.value" class="h-4 w-4" />
              <Pause v-else class="h-4 w-4" />
            </button>
            <button
              v-else-if="!speech.speaking.value"
              type="button"
              class="rounded-full p-2 text-navy transition-colors hover:bg-cream disabled:opacity-40"
              aria-label="Say that again"
              :disabled="!lastReply || sending"
              @click="replay"
            >
              <RotateCcw class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded-full p-2 text-navy transition-colors hover:bg-cream"
              :aria-label="muted ? 'Turn sound on' : 'Mute'"
              :aria-pressed="muted"
              @click="toggleMute"
            >
              <VolumeX v-if="muted" class="h-4 w-4" />
              <Volume2 v-else class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="ml-1 rounded-full bg-coral p-2.5 text-white transition-colors hover:bg-navy disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Ask another question"
              :disabled="sending"
              @click="listen"
            >
              <Mic class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Text input -->
        <form v-else-if="mode === 'text'" class="flex items-end gap-2 border-t border-tan bg-white px-3 py-3" @submit.prevent="send()">
          <label for="support-chat-input" class="sr-only">Your message</label>
          <textarea
            id="support-chat-input"
            ref="input"
            v-model="draft"
            rows="1"
            maxlength="1000"
            placeholder="Ask a question…"
            class="max-h-28 flex-1 resize-none rounded-2xl border-2 border-tan bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-coral"
            @keydown="onKeydown"
          />
          <button
            v-if="voiceReady"
            type="button"
            class="rounded-full p-2.5 text-navy transition-colors hover:bg-cream"
            aria-label="Talk instead"
            @click="useVoice"
          >
            <Mic class="h-4 w-4" />
          </button>
          <button
            type="submit"
            class="rounded-full bg-green p-2.5 text-white transition-colors hover:bg-navy disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="sending || !draft.trim()"
            aria-label="Send message"
          >
            <Send class="h-4 w-4" />
          </button>
        </form>
      </section>
    </Transition>

    <div class="flex items-center gap-2">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-x-2"
        leave-active-class="transition duration-200 ease-in"
        leave-to-class="opacity-0"
      >
        <button
          v-if="showHint && !open"
          type="button"
          class="rounded-2xl rounded-br-md border border-tan bg-white px-3 py-2 text-sm font-semibold text-navy shadow-warm"
          @click="toggle"
        >
          Need help? Just ask
        </button>
      </Transition>
      <button
        type="button"
        class="relative flex h-14 w-14 items-center justify-center rounded-full bg-coral text-white shadow-warm-lg transition-transform duration-200 hover:-translate-y-0.5 hover:bg-navy active:scale-95"
        :aria-label="open ? 'Close help chat' : 'Open help chat'"
        :aria-expanded="open"
        aria-controls="support-chat"
        @click="toggle"
      >
        <X v-if="open" class="h-6 w-6" />
        <template v-else-if="voiceReady">
          <Mic class="h-6 w-6" />
          <span class="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-cream bg-green">
            <MessageCircle class="h-2.5 w-2.5" />
          </span>
        </template>
        <MessageCircle v-else class="h-6 w-6" />
      </button>
    </div>
  </div>
</template>
