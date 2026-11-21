// Sends stories to the owner's own WhatsApp through CallMeBot, a free service for
// messaging yourself: the owner registers their number with CallMeBot's bot once and
// gets an API key (CALLMEBOT_PHONE, CALLMEBOT_APIKEY). It can only message that number.

const CALLMEBOT_URL = 'https://api.callmebot.com/whatsapp.php'
// The text travels in the URL, so a long story goes as a few messages, split between paragraphs.
const MAX_MESSAGE_CHARS = 1500
// CallMeBot's free service limits how fast messages can be sent.
const PAUSE_BETWEEN_MS = 2000

export interface WhatsAppStory {
  title: string
  emoji: string
  excerpt: string
  body: string[]
  // Set for a published story, for the link at the end.
  slug?: string
}

/** The story as WhatsApp messages: title, excerpt, the story, and a link when it's published. */
export function storyMessages(story: WhatsAppStory, siteUrl?: string): string[] {
  const parts = [
    `${story.emoji} *${story.title}*`,
    `_${story.excerpt}_`,
    ...story.body.map((p) => p.trim()).filter(Boolean),
    story.slug && siteUrl ? `Read it on Kidstory: ${siteUrl.replace(/\/$/, '')}/stories/${story.slug}` : ''
  ].filter(Boolean)
  const messages: string[] = []
  let current = ''
  for (const part of parts) {
    if (current && current.length + part.length + 2 > MAX_MESSAGE_CHARS) {
      messages.push(current)
      current = ''
    }
    current = current ? `${current}\n\n${part}` : part
  }
  if (current) messages.push(current)
  return messages
}

export async function sendToWhatsApp(messages: string[]): Promise<void> {
  const config = useRuntimeConfig()
  const phone = String(config.callmebotPhone ?? '').trim()
  const apikey = String(config.callmebotApikey ?? '').trim()
  if (!phone || !apikey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'WhatsApp isn\'t set up: add CALLMEBOT_PHONE and CALLMEBOT_APIKEY on the server.'
    })
  }
  for (const [i, text] of messages.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_MS))
    let reply = ''
    try {
      reply = await $fetch<string>(CALLMEBOT_URL, { query: { phone, text, apikey }, responseType: 'text', timeout: 20000 })
    } catch (err: any) {
      reply = String(err?.data ?? err?.message ?? '')
    }
    // CallMeBot answers with a short HTML page either way; only these mean it went out.
    if (!/queued|sent/i.test(reply) || /error|invalid|not (valid|allowed)/i.test(reply)) {
      const why = reply.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
      console.error('CallMeBot refused a message:', why)
      throw createError({ statusCode: 502, statusMessage: `WhatsApp didn't send: ${why || 'no answer from CallMeBot'}` })
    }
  }
}
