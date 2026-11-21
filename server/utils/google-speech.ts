// Google Cloud Text-to-Speech and Speech-to-Text for the Studio voice agent, called
// with the server's GOOGLE_CLOUD_API_KEY (never sent to the browser). Both have a
// free monthly allowance; see Google Cloud's pricing pages for the current limits.

const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'
const STT_URL = 'https://speech.googleapis.com/v1/speech:recognize'
// One of Google's most natural voices (Chirp 3 HD). GOOGLE_TTS_VOICE picks another,
// e.g. en-US-Chirp3-HD-Charon; the language is taken from the voice name.
const DEFAULT_VOICE = 'en-US-Chirp3-HD-Aoede'
// Google takes up to 5,000 bytes of text per request; replies and story paragraphs are far shorter.
export const MAX_SPEAK_CHARS = 4000

function apiKey(): string {
  const key = String(useRuntimeConfig().googleCloudApiKey ?? '')
  if (!key) {
    throw createError({ statusCode: 503, statusMessage: 'The realistic voice needs GOOGLE_CLOUD_API_KEY on the server.' })
  }
  return key
}

async function callGoogle<T>(url: string, body: unknown): Promise<T> {
  const key = apiKey()
  try {
    return await $fetch<T>(url, { method: 'POST', query: { key }, body })
  } catch (err: any) {
    const message = err?.data?.error?.message || err?.message || 'Google speech request failed.'
    console.error('Google speech failed:', message)
    throw createError({ statusCode: 502, statusMessage: `Google speech: ${message}` })
  }
}

/** Speaks `text` with Google's voice; returns base64 MP3. */
export async function synthesizeSpeech(text: string): Promise<string> {
  const voice = String(useRuntimeConfig().googleTtsVoice || DEFAULT_VOICE)
  const languageCode = voice.split('-').slice(0, 2).join('-')
  const res = await callGoogle<{ audioContent: string }>(TTS_URL, {
    input: { text: text.slice(0, MAX_SPEAK_CHARS) },
    voice: { languageCode, name: voice },
    audioConfig: { audioEncoding: 'MP3' }
  })
  return res.audioContent
}

// The browser sends 16 kHz, 16-bit mono PCM, what Google recognises best.
export const SPEECH_SAMPLE_RATE = 16000

/** Turns a short recording (base64 16 kHz LINEAR16 PCM from the browser) into text. */
export async function transcribeSpeech(audio: string, languageCode = 'en-US'): Promise<string> {
  const res = await callGoogle<{ results?: { alternatives?: { transcript?: string }[] }[] }>(STT_URL, {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: SPEECH_SAMPLE_RATE,
      languageCode,
      enableAutomaticPunctuation: true,
      model: 'latest_short'
    },
    audio: { content: audio }
  })
  return (res.results ?? [])
    .map((r) => r.alternatives?.[0]?.transcript ?? '')
    .join(' ')
    .trim()
}
