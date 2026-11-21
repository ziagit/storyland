// What the owner said to the Studio voice agent: a short recording in, text out.
// The browser records with echo cancellation, so the agent's own voice is left out.

// A minute of 16 kHz 16-bit audio as base64.
const MAX_AUDIO_CHARS = Math.ceil((SPEECH_SAMPLE_RATE * 2 * 60 * 4) / 3)

export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  const body = await readBody<{ audio?: unknown }>(event)
  const audio = typeof body?.audio === 'string' ? body.audio : ''
  if (!audio) {
    throw createError({ statusCode: 400, statusMessage: 'No audio.' })
  }
  if (audio.length > MAX_AUDIO_CHARS) {
    throw createError({ statusCode: 400, statusMessage: 'That was too long. Keep it under a minute.' })
  }
  return { text: await transcribeSpeech(audio) }
})
