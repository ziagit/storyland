// The browser's own speech recognition and speech synthesis, for the help chat's
// voice mode. Nothing is installed or paid for: Chrome, Edge and Safari support
// both; Firefox has no recognition, so the chat stays text-only there.

// Not in TypeScript's DOM types yet.
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult:
    | ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void)
    | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionConstructor = new () => Recognition

const ERRORS: Record<string, string> = {
  'not-allowed': 'Allow microphone access to talk, or type your question instead.',
  'service-not-allowed': 'Allow microphone access to talk, or type your question instead.',
  'audio-capture': "No microphone was found. Type your question instead.",
  'no-speech': "I didn't hear anything. Tap the microphone and try again.",
  network: 'Voice needs an internet connection. Type your question instead.'
}

// Voices that sound less robotic, best first. Whatever matches the language is used otherwise.
const PREFERRED_VOICES = [/natural/i, /google/i, /samantha/i, /karen|moira|serena/i]

function recognitionConstructor(): RecognitionConstructor | null {
  if (!import.meta.client) return null
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const base = lang.split('-')[0]
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(base.toLowerCase()))
  for (const pattern of PREFERRED_VOICES) {
    const voice = voices.find((v) => pattern.test(v.name))
    if (voice) return voice
  }
  return voices[0] ?? null
}

export function useSpeech() {
  const canListen = ref(false)
  const canSpeak = ref(false)
  const listening = ref(false)
  // What the reader has said so far, updated as they speak.
  const transcript = ref('')
  const speaking = ref(false)
  const paused = ref(false)
  const error = ref('')

  let recognition: Recognition | null = null
  // Listening in the background while speech plays, so the reader can interrupt.
  let background: Recognition | null = null
  let onHeard: ((text: string, isFinal: boolean) => void) | null = null
  let lang = 'en-US'
  // Bumped on every new speech or stop, so a cancelled queue's late events are ignored.
  let generation = 0
  let keepAlive: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    canListen.value = !!recognitionConstructor()
    canSpeak.value = 'speechSynthesis' in window
    lang = navigator.language || 'en-US'
    // Chrome loads its voices after the page; asking once starts that.
    if (canSpeak.value) speechSynthesis.getVoices()
  })

  onBeforeUnmount(() => {
    recognition?.abort()
    stopHearing()
    stopSpeaking()
  })

  /** Listens until the reader pauses (or `stopListening` is called), then hands what they said to `onDone`. */
  function listen(onDone: (text: string) => void) {
    const Constructor = recognitionConstructor()
    if (!Constructor || listening.value) return
    stopHearing()
    stopSpeaking()
    error.value = ''
    transcript.value = ''
    const r = new Constructor()
    r.lang = lang
    r.interimResults = true
    r.continuous = false
    r.onresult = (e) => {
      transcript.value = Array.from(e.results, (result) => result[0]?.transcript ?? '').join('')
    }
    r.onerror = (e) => {
      if (e.error !== 'aborted') error.value = ERRORS[e.error] ?? "Voice didn't work just now. Try again, or type instead."
    }
    r.onend = () => {
      listening.value = false
      recognition = null
      const text = transcript.value.trim()
      if (text && !error.value) onDone(text)
    }
    recognition = r
    listening.value = true
    try {
      r.start()
    } catch {
      listening.value = false
      recognition = null
      error.value = "Voice didn't work just now. Try again, or type instead."
    }
  }

  /** Stops listening; what was heard so far is still sent. */
  function stopListening() {
    recognition?.stop()
  }

  /** Stops listening and throws away what was heard. */
  function cancelListening() {
    transcript.value = ''
    recognition?.abort()
  }

  /**
   * Keeps the microphone on in the background and passes everything it hears to `handler`, as the
   * reader speaks (`isFinal` false) and once they pause (true). Restarts itself, since the browser
   * ends a listening session after a while, until `stopHearing` is called. The microphone also
   * picks up the speech this page is playing, so the handler must tell the reader from the echo.
   */
  function hear(handler: (text: string, isFinal: boolean) => void) {
    onHeard = handler
    if (background || recognition) return
    const Constructor = recognitionConstructor()
    if (!Constructor) return
    const r = new Constructor()
    r.lang = lang
    r.interimResults = true
    r.continuous = true
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (result) onHeard?.(result[0]?.transcript ?? '', result.isFinal)
      }
    }
    r.onerror = (e) => {
      // Silence and our own aborts are normal; anything else (no permission, no network) ends it.
      if (e.error !== 'no-speech' && e.error !== 'aborted') onHeard = null
    }
    r.onend = () => {
      if (background === r) background = null
      const next = onHeard
      if (next) setTimeout(() => onHeard === next && hear(next), 250)
    }
    background = r
    try {
      r.start()
    } catch {
      background = null
    }
  }

  function stopHearing() {
    onHeard = null
    const r = background
    background = null
    r?.abort()
  }

  function stopKeepAlive() {
    if (keepAlive) clearInterval(keepAlive)
    keepAlive = null
  }

  /** Reads `text` aloud; an array is read in order, one utterance per part (a whole story, paragraph by paragraph). */
  function speak(text: string | string[]) {
    const parts = (Array.isArray(text) ? text : [text]).map((t) => t.trim()).filter(Boolean)
    if (!canSpeak.value || !parts.length) return
    stopSpeaking()
    const run = generation
    const finish = () => {
      if (run !== generation) return
      speaking.value = false
      paused.value = false
      stopKeepAlive()
    }
    const voice = pickVoice(lang)
    parts.forEach((part, i) => {
      const utterance = new SpeechSynthesisUtterance(part)
      utterance.lang = lang
      utterance.voice = voice
      utterance.rate = 0.95
      if (i === parts.length - 1) utterance.onend = finish
      utterance.onerror = finish
      speechSynthesis.speak(utterance)
    })
    speaking.value = true
    // Chrome stops long speech after ~15s unless nudged; resume() does nothing when not paused.
    keepAlive = setInterval(() => {
      if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.resume()
    }, 10000)
  }

  function togglePause() {
    if (!speaking.value) return
    if (paused.value) speechSynthesis.resume()
    else speechSynthesis.pause()
    paused.value = !paused.value
  }

  function stopSpeaking() {
    if (!canSpeak.value) return
    generation++
    stopKeepAlive()
    speechSynthesis.cancel()
    speaking.value = false
    paused.value = false
  }

  return {
    canListen,
    canSpeak,
    listening,
    transcript,
    speaking,
    paused,
    error,
    listen,
    stopListening,
    cancelListening,
    hear,
    stopHearing,
    speak,
    togglePause,
    stopSpeaking
  }
}
