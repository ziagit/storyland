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
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
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
  let lang = 'en-US'

  onMounted(() => {
    canListen.value = !!recognitionConstructor()
    canSpeak.value = 'speechSynthesis' in window
    lang = navigator.language || 'en-US'
    // Chrome loads its voices after the page; asking once starts that.
    if (canSpeak.value) speechSynthesis.getVoices()
  })

  onBeforeUnmount(() => {
    recognition?.abort()
    if (canSpeak.value) speechSynthesis.cancel()
  })

  /** Listens until the reader pauses (or `stopListening` is called), then hands what they said to `onDone`. */
  function listen(onDone: (text: string) => void) {
    const Constructor = recognitionConstructor()
    if (!Constructor || listening.value) return
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

  function speak(text: string) {
    if (!canSpeak.value || !text.trim()) return
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.voice = pickVoice(lang)
    utterance.rate = 0.95
    utterance.onstart = () => {
      speaking.value = true
      paused.value = false
    }
    utterance.onend = utterance.onerror = () => {
      speaking.value = false
      paused.value = false
    }
    speechSynthesis.speak(utterance)
  }

  function togglePause() {
    if (!speaking.value) return
    if (paused.value) speechSynthesis.resume()
    else speechSynthesis.pause()
    paused.value = !paused.value
  }

  function stopSpeaking() {
    if (!canSpeak.value) return
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
    speak,
    togglePause,
    stopSpeaking
  }
}
