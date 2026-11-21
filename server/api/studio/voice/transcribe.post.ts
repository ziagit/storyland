// What the owner said to the Studio voice agent: a short recording in, text out.
// The browser records with echo cancellation, so the agent's own voice is left out.

// A minute of 16 kHz 16-bit audio as base64; Google's quick recognition stops at 60s.
const MAX_AUDIO_CHARS = Math.ceil((SPEECH_SAMPLE_RATE * 2 * 60 * 4) / 3)

export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  const body = await readBody<{ audio?: unknown; language?: unknown }>(event)
  const audio = typeof body?.audio === 'string' ? body.audio : ''
  if (!audio) {
    throw createError({ statusCode: 400, statusMessage: 'No audio.' })
  }
  if (audio.length > MAX_AUDIO_CHARS) {
    throw createError({ statusCode: 400, statusMessage: 'That was too long. Keep it under a minute.' })
  }
  const language = typeof body?.language === 'string' && /^[a-z]{2}-[A-Z]{2}$/.test(body.language) ? body.language : 'en-US'
  return { text: await transcribeSpeech(audio, language) }
})
