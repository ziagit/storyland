// The Studio voice agent's voice: text in, Google's speech out (base64 MP3).
export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  const body = await readBody<{ text?: unknown }>(event)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'Nothing to say.' })
  }
  if (text.length > MAX_SPEAK_CHARS) {
    throw createError({ statusCode: 400, statusMessage: `Keep it under ${MAX_SPEAK_CHARS} characters.` })
  }
  return { audio: await synthesizeSpeech(text), mimeType: 'audio/mpeg' }
})
