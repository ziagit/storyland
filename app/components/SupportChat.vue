<script setup lang="ts">
import { MessageCircle, Send, X } from '@lucide/vue'
import type { ChatMessage } from '../../shared/utils/story-authoring'

const GREETING = "Hi! I'm Kidstory's helper. Ask me about stories for your child, signing in, or Full Access."

const { accessToken } = useAuth()
const open = ref(false)
const draft = ref('')
const sending = ref(false)
const error = ref('')
// The conversation as the API returned it, sent back with each message. It lives
// in this component (mounted once in app.vue), so it survives page navigation.
const history = ref<ChatMessage[]>([])
const scroller = ref<HTMLElement | null>(null)
const input = ref<HTMLTextAreaElement | null>(null)

// Site paths in a reply ("/stories/moonlight-friends", "/checkout") become links.
const PATH = /(\/(?:stories\/[a-z0-9-]+|stories|account|checkout|contact|about))(?=[\s.,;:!?)]|$)/g

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

async function scrollToEnd() {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
}

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    input.value?.focus()
    scrollToEnd()
  }
}

async function send() {
  const message = draft.value.trim()
  if (!message || sending.value) return
  error.value = ''
  sending.value = true
  const before = history.value
  history.value = [...before, { role: 'user', content: message }]
  draft.value = ''
  scrollToEnd()
  try {
    const res = await $fetch<{ reply: string; history: ChatMessage[] }>('/api/support/chat', {
      method: 'POST',
      body: { message, history: before },
      headers: accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : undefined
    })
    history.value = res.history
  } catch (err: any) {
    history.value = before
    draft.value = message
    error.value = err?.data?.statusMessage || err?.statusMessage || 'Something went wrong. Please try again.'
  } finally {
    sending.value = false
    scrollToEnd()
    input.value?.focus()
  }
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
            <p class="text-xs text-white/70">Answers in seconds · a person follows up if needed</p>
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

        <div ref="scroller" class="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          <p class="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-navy shadow-sm">
            {{ GREETING }}
          </p>
          <p
            v-for="(turn, i) in history"
            :key="i"
            class="max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm shadow-sm"
            :class="turn.role === 'user' ? 'ml-auto rounded-br-md bg-green text-white' : 'rounded-bl-md bg-white text-navy'"
          >
            <template v-for="(part, j) in segments(turn.content)" :key="j">
              <NuxtLink v-if="part.to" :to="part.to" class="font-bold text-coral underline underline-offset-2">{{ part.text }}</NuxtLink>
              <template v-else>{{ part.text }}</template>
            </template>
          </p>
          <p v-if="sending" class="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm" aria-label="Helper is typing">
            <span class="h-2 w-2 animate-bounce rounded-full bg-ink-muted/60" />
            <span class="h-2 w-2 animate-bounce rounded-full bg-ink-muted/60 [animation-delay:150ms]" />
            <span class="h-2 w-2 animate-bounce rounded-full bg-ink-muted/60 [animation-delay:300ms]" />
          </p>
        </div>

        <p v-if="error" class="px-4 pb-2 text-sm text-coral">{{ error }}</p>

        <form class="flex items-end gap-2 border-t border-tan bg-white px-3 py-3" @submit.prevent="send">
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

    <button
      type="button"
      class="flex h-14 w-14 items-center justify-center rounded-full bg-coral text-white shadow-warm-lg transition-transform duration-200 hover:-translate-y-0.5 hover:bg-navy active:scale-95"
      :aria-label="open ? 'Close help chat' : 'Open help chat'"
      :aria-expanded="open"
      aria-controls="support-chat"
      @click="toggle"
    >
      <X v-if="open" class="h-6 w-6" />
      <MessageCircle v-else class="h-6 w-6" />
    </button>
  </div>
</template>
