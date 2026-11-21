// The Studio voice agent's ears and voice. Speech is Google's (Text-to-Speech through
// /api/studio/voice/speak), and so is understanding (Speech-to-Text through
// /api/studio/voice/transcribe).
//
// The mic is opened with the browser's echo cancellation, which takes the agent's
// own voice out of what it hears, and stays open while the Voice tab is in use, so
// the owner can talk over a reply: "stop", "pause" and "continue" work, and anything
// else cuts the reply off and becomes a new request. A short ring buffer keeps the
// moment before speech starts, so a quick "stop" isn't clipped.

const SAMPLE_RATE = 16000
// How loud (RMS) the mic has to be to count as speech, at least; it rises with the
// room's background noise, and more while the agent is talking (in case any of its
// voice gets past echo cancellation).
const MIN_SPEECH_LEVEL = 0.012
const MIN_BARGE_LEVEL = 0.03
// Speech has to last this long to interrupt a reply.
const BARGE_ONSET_MS = 200
// A request ends after this much quiet.
const END_SILENCE_MS = 1000
const NO_SPEECH_MS = 7000
const MAX_UTTERANCE_MS = 30000
// Audio kept from just before speech is detected.
const PRE_ROLL_MS = 500

const STOP = /\b(stop|quiet|shush|shh+|enough|silence)\b/
const PAUSE = /\b(pause|wait|hold on)\b/
const RESUME = /\b(continue|resume|go on|keep going|carry on)\b/

function wordsOf(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean)
}

function pairsOf(words: string[]): string[] {
  return words.slice(1).map((word, i) => `${words[i]} ${word}`)
}

// Averages the mic's samples down to 16 kHz.
function downsample(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === SAMPLE_RATE) return input.slice()
  const ratio = fromRate / SAMPLE_RATE
  const out = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(input.length, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end; j++) sum += input[j]!
    out[i] = sum / Math.max(1, end - start)
  }
  return out
}

function toBase64Pcm(chunks: Float32Array[]): string {
  const length = chunks.reduce((n, c) => n + c.length, 0)
  const bytes = new Uint8Array(length * 2)
  const view = new DataView(bytes.buffer)
  let offset = 0
  for (const chunk of chunks) {
    for (const sample of chunk) {
      view.setInt16(offset, Math.max(-1, Math.min(1, sample)) * 0x7fff, true)
      offset += 2
    }
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function rms(samples: Float32Array): number {
  let sum = 0
  for (const s of samples) sum += s * s
  return Math.sqrt(sum / Math.max(1, samples.length))
}

/**
 * `onAsk` gets each spoken request as text. `enabled` says when the voice agent is on
 * screen; the mic closes when it isn't.
 */
export function useStudioVoice(onAsk: (text: string) => void, enabled: () => boolean) {
  const adminFetch = useAdminApi()

  const ready = ref(false)
  // Recording a request after a tap (or while the owner talks over a reply).
  const listening = ref(false)
  // Waiting for Google to turn the recording into text.
  const transcribing = ref(false)
  const speaking = ref(false)
  const paused = ref(false)
  const error = ref('')
  // The mic's loudness, 0 to 1, for the orb.
  const level = ref(0)

  let stream: MediaStream | null = null
  let context: AudioContext | null = null
  let processor: ScriptProcessorNode | null = null
  let source: MediaStreamAudioSourceNode | null = null

  // Recent mic audio, for the pre-roll.
  let ring: Float32Array[] = []
  let ringMs = 0
  // The utterance being recorded, and what it's for.
  let utterance: Float32Array[] | null = null
  let utteranceKind: 'request' | 'barge' = 'request'
  let utteranceMs = 0
  let spokeMs = 0
  let quietMs = 0
  let onsetMs = 0
  let noiseFloor = 0.005
  // Whether the reply was paused because the owner started talking (not because they said pause).
  let held = false

  // Playback: one part at a time, the next one fetched while the current one plays.
  const audio = import.meta.client ? new Audio() : null
  let queue: string[] = []
  let nextAudio: Promise<string | null> | null = null
  let generation = 0
  let spokenPairs = new Set<string>()

  onMounted(() => {
    ready.value =
      !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== 'undefined' && typeof Audio !== 'undefined'
  })
  onBeforeUnmount(() => {
    stopSpeaking()
    closeMic()
  })
  watch(enabled, (on) => {
    if (!on) {
      cancelListening()
      stopSpeaking()
      closeMic()
    }
  })

  async function openMic(): Promise<boolean> {
    if (stream) return true
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
      })
    } catch {
      error.value = 'Allow microphone access to talk to the assistant.'
      return false
    }
    context = new AudioContext()
    source = context.createMediaStreamSource(stream)
    // ScriptProcessor is old but works everywhere without a separate worklet file.
    processor = context.createScriptProcessor(2048, 1, 1)
    processor.onaudioprocess = (e) => onFrame(e.inputBuffer.getChannelData(0), context!.sampleRate)
    source.connect(processor)
    processor.connect(context.destination)
    return true
  }

  function closeMic() {
    processor?.disconnect()
    source?.disconnect()
    stream?.getTracks().forEach((t) => t.stop())
    context?.close().catch(() => {})
    processor = null
    source = null
    stream = null
    context = null
    ring = []
    ringMs = 0
    level.value = 0
  }

  function onFrame(raw: Float32Array, rate: number) {
    const frame = downsample(raw, rate)
    const frameMs = (frame.length / SAMPLE_RATE) * 1000
    const loudness = rms(frame)
    level.value = Math.min(1, loudness * 12)

    ring.push(frame)
    ringMs += frameMs
    while (ringMs > PRE_ROLL_MS && ring.length > 1) ringMs -= (ring.shift()!.length / SAMPLE_RATE) * 1000

    const threshold = speaking.value
      ? Math.max(MIN_BARGE_LEVEL, noiseFloor * 5)
      : Math.max(MIN_SPEECH_LEVEL, noiseFloor * 3)
    const loud = loudness > threshold
    if (!loud && !utterance) noiseFloor = noiseFloor * 0.95 + loudness * 0.05

    if (!utterance) {
      // Talking over a reply: once it's clearly speech, hold the reply and record.
      if (speaking.value && !paused.value) {
        onsetMs = loud ? onsetMs + frameMs : 0
        if (onsetMs >= BARGE_ONSET_MS) {
          hold()
          startUtterance('barge')
        }
      } else if (speaking.value && paused.value && loud) {
        onsetMs += frameMs
        if (onsetMs >= BARGE_ONSET_MS) startUtterance('barge')
      } else {
        onsetMs = 0
      }
      return
    }

    utterance.push(frame)
    utteranceMs += frameMs
    if (loud) {
      spokeMs += frameMs
      quietMs = 0
    } else {
      quietMs += frameMs
    }
    const done = (spokeMs > 250 && quietMs >= END_SILENCE_MS) || utteranceMs >= MAX_UTTERANCE_MS
    const nothing = spokeMs <= 250 && utteranceMs >= NO_SPEECH_MS
    if (done) finishUtterance()
    else if (nothing) {
      cancelListening()
      if (utteranceKind === 'request') error.value = "I didn't hear anything. Tap to try again."
    }
  }

  function startUtterance(kind: 'request' | 'barge') {
    utterance = [...ring]
    utteranceKind = kind
    utteranceMs = ringMs
    spokeMs = kind === 'barge' ? onsetMs : 0
    quietMs = 0
    onsetMs = 0
    listening.value = true
  }

  async function finishUtterance() {
    const chunks = utterance
    const kind = utteranceKind
    utterance = null
    listening.value = false
    if (!chunks?.length) return
    transcribing.value = true
    let text = ''
    try {
      const res = await adminFetch<{ text: string }>('/api/studio/voice/transcribe', {
        method: 'POST',
        body: { audio: toBase64Pcm(chunks) }
      })
      text = res.text
    } catch (err: any) {
      error.value = err?.data?.statusMessage || "Couldn't understand that. Try again."
    } finally {
      transcribing.value = false
    }
    if (kind === 'barge') return onBarge(text)
    if (text) onAsk(text)
    else if (!error.value) error.value = "I didn't catch that. Tap to try again."
  }

  function isEcho(words: string[]): boolean {
    const pairs = pairsOf(words)
    return pairs.length > 0 && pairs.filter((pair) => spokenPairs.has(pair)).length / pairs.length >= 0.5
  }

  // What the owner said over a reply: a command, nothing (a false alarm), or a new request.
  function onBarge(text: string) {
    const words = wordsOf(text)
    const heldForOwner = held
    held = false
    const short = words.length > 0 && words.length <= 4 && !(words.length > 1 && isEcho(words))
    const said = words.join(' ')
    if (short && STOP.test(said)) return stopSpeaking()
    if (short && PAUSE.test(said)) return
    if ((short && RESUME.test(said)) || !words.length || isEcho(words)) {
      if (paused.value && (heldForOwner || RESUME.test(said))) resume()
      return
    }
    stopSpeaking()
    onAsk(text)
  }

  /** Tap: start listening, or finish now if already listening. Cuts off a reply. */
  async function talk() {
    error.value = ''
    if (listening.value) return finishUtterance()
    if (transcribing.value) return
    stopSpeaking()
    if (!(await openMic())) return
    await context?.resume()
    startUtterance('request')
  }

  function cancelListening() {
    utterance = null
    listening.value = false
  }

  async function fetchAudio(text: string, run: number): Promise<string | null> {
    try {
      const res = await adminFetch<{ audio: string; mimeType: string }>('/api/studio/voice/speak', {
        method: 'POST',
        body: { text }
      })
      return run === generation ? `data:${res.mimeType};base64,${res.audio}` : null
    } catch (err: any) {
      if (run === generation) error.value = err?.data?.statusMessage || "The voice didn't work just now."
      return null
    }
  }

  async function playNext(run: number) {
    if (run !== generation || !audio) return
    const current = nextAudio
    queue.shift()
    if (!current) return finishSpeaking(run)
    nextAudio = queue.length ? fetchAudio(queue[0]!, run) : null
    const src = await current
    if (run !== generation) return
    if (!src) return finishSpeaking(run)
    audio.src = src
    audio.onended = () => playNext(run)
    try {
      if (!paused.value) await audio.play()
    } catch {
      finishSpeaking(run)
    }
  }

  function finishSpeaking(run: number) {
    if (run !== generation) return
    speaking.value = false
    paused.value = false
    held = false
  }

  /** Reads `parts` aloud in order (a reply, then a story paragraph by paragraph). */
  async function say(parts: string[]) {
    const clean = parts.map((p) => p.trim()).filter(Boolean)
    if (!clean.length || !audio) return
    stopSpeaking()
    const run = generation
    spokenPairs = new Set(pairsOf(wordsOf(clean.join(' '))))
    queue = clean
    nextAudio = fetchAudio(queue[0]!, run)
    speaking.value = true
    // Keep the mic open while it talks, so the owner can interrupt (if they've used it).
    if (stream) await context?.resume()
    playNext(run)
  }

  function hold() {
    if (!speaking.value || paused.value) return
    audio?.pause()
    paused.value = true
    held = true
  }

  function resume() {
    if (!speaking.value) return
    paused.value = false
    audio?.play().catch(() => {})
  }

  function togglePause() {
    if (!speaking.value) return
    if (paused.value) resume()
    else {
      audio?.pause()
      paused.value = true
    }
  }

  function stopSpeaking() {
    generation++
    queue = []
    nextAudio = null
    if (audio) {
      audio.onended = null
      audio.pause()
    }
    speaking.value = false
    paused.value = false
    held = false
  }

  return {
    ready,
    listening,
    transcribing,
    speaking,
    paused,
    error,
    level,
    say,
    talk,
    cancelListening,
    togglePause,
    stopSpeaking
  }
}
