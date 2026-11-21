// Gemini speech for the Studio voice agent: Gemini's text-to-speech gives it a natural
// voice, and a fast Gemini model turns the owner's recordings into text. Both use the
// server's GEMINI_API_KEY (a Google AI Studio key, never sent to the browser) and fit
// the Gemini API's free tier, which has per-minute and per-day limits.

const API = 'https://generativelanguage.googleapis.com/v1beta/models'
// Tried in order: when a model is busy, over its limit or too slow, the next one is used.
// GEMINI_TTS_MODEL / GEMINI_STT_MODEL put another model first.
const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts']
// Transcribing needs no thinking; each model takes a different setting for "as little as possible".
const STT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']
const STT_THINKING: Record<string, object> = {
  'gemini-3.5-flash-lite': { thinkingLevel: 'minimal' },
  'gemini-3.1-flash-lite': { thinkingLevel: 'minimal' },
  'gemini-3.8-flash': { thinkingLevel: 'low' }
}
// Gemini's speed swings with demand; past this, the next model is tried.
const STT_TIMEOUT_MS = 8000
const TTS_TIMEOUT_MS = 20000
// A warm, gentle voice. GEMINI_TTS_VOICE picks another of Gemini's voices (e.g. Kore, Puck).
const DEFAULT_VOICE = 'Sulafat'
export const MAX_SPEAK_CHARS = 4000
// The browser sends 16 kHz, 16-bit mono PCM.
export const SPEECH_SAMPLE_RATE = 16000

const TRANSCRIBE_PROMPT =
  'Transcribe the speech in this audio exactly. Reply with only the words spoken. ' +
  'If there is no clear speech (silence, a cough, a noise or background sound), reply with exactly: [none]'
// "[none]" (sometimes cut short to "["), or a model describing silence instead of saying [none].
const NO_WORDS = /^\s*(\[|\(?\s*(no (speech|words|audio)|silence|inaudible|empty))/i

interface InlineData {
  mimeType: string
  data: string
}
interface GenerateResponse {
  candidates?: { content?: { parts?: { text?: string; inlineData?: InlineData }[] } }[]
}

function apiKey(): string {
  const key = String(useRuntimeConfig().geminiApiKey ?? '')
  if (!key) {
    throw createError({ statusCode: 503, statusMessage: 'The voice agent needs GEMINI_API_KEY on the server.' })
  }
  return key
}

function models(preferred: unknown, defaults: string[]): string[] {
  const first = String(preferred ?? '').trim()
  return first ? [first, ...defaults.filter((m) => m !== first)] : defaults
}

async function generate(
  candidates: string[],
  body: (model: string) => unknown,
  timeout: number
): Promise<GenerateResponse> {
  const key = apiKey()
  let lastError = 'Gemini request failed.'
  // Whether every model said its free limit is used up (each has its own daily quota).
  let allOverLimit = true
  for (const model of candidates) {
    try {
      return await $fetch<GenerateResponse>(`${API}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': key },
        body: body(model),
        timeout
      })
    } catch (err: any) {
      lastError = err?.data?.error?.message || err?.message || lastError
      if (err?.statusCode !== 429) allOverLimit = false
      // Busy, over the free tier's limit, gone, or too slow: try the next model. Anything else is our request.
      const timedOut = err?.name === 'FetchError' && !err?.statusCode
      if (!timedOut && ![404, 429, 500, 503].includes(err?.statusCode)) break
    }
  }
  console.error('Gemini speech failed:', lastError)
  if (allOverLimit) {
    // A 429 tells the page to use the browser's own voice instead, without asking again.
    throw createError({ statusCode: 429, statusMessage: "Gemini's free speech limit is used up for now." })
  }
  throw createError({ statusCode: 502, statusMessage: `Gemini: ${lastError}` })
}

// Gemini returns either a WAV file or raw 16-bit PCM ("audio/L16;...;rate=24000").
function asWav(audio: InlineData): Buffer {
  const bytes = Buffer.from(audio.data, 'base64')
  if (audio.mimeType.includes('wav')) return bytes
  const rate = Number(/rate=(\d+)/.exec(audio.mimeType)?.[1] ?? 24000)
  return pcmToWav(bytes, rate)
}

function pcmToWav(pcm: Buffer, rate: number): Buffer {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(rate, 24)
  header.writeUInt32LE(rate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

/** Speaks `text` in Gemini's voice; returns base64 WAV. */
export async function synthesizeSpeech(text: string): Promise<string> {
  const config = useRuntimeConfig()
  const res = await generate(
    models(config.geminiTtsModel, TTS_MODELS),
    () => ({
      contents: [{ parts: [{ text: text.slice(0, MAX_SPEAK_CHARS) }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: String(config.geminiTtsVoice || DEFAULT_VOICE) } } }
      }
    }),
    TTS_TIMEOUT_MS
  )
  const audio = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!audio) throw createError({ statusCode: 502, statusMessage: 'Gemini returned no audio.' })
  return asWav(audio).toString('base64')
}

/** Turns a short recording (base64 16 kHz PCM from the browser) into text. */
export async function transcribeSpeech(audio: string): Promise<string> {
  const wav = pcmToWav(Buffer.from(audio, 'base64'), SPEECH_SAMPLE_RATE)
  const data = wav.toString('base64')
  const res = await generate(
    models(useRuntimeConfig().geminiSttModel, STT_MODELS),
    (model) => ({
      contents: [{ parts: [{ text: TRANSCRIBE_PROMPT }, { inlineData: { mimeType: 'audio/wav', data } }] }],
      ...(STT_THINKING[model] ? { generationConfig: { thinkingConfig: STT_THINKING[model] } } : {})
    }),
    STT_TIMEOUT_MS
  )
  const text = (res.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join(' ').trim()
  return NO_WORDS.test(text) ? '' : text
}
