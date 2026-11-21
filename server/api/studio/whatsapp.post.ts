// Sends a story to the owner's own WhatsApp: a published one by slug, or the Studio's
// current draft. The Studio assistant asks for this; it only ever reaches the owner.
import { getStory, KidstoryApiError } from '../../../shared/utils/kidstory-api'

export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  const body = await readBody<{ slug?: unknown; draft?: unknown }>(event)
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''

  let story: WhatsAppStory
  if (slug) {
    try {
      story = { ...(await getStory(useKidstoryApi(), slug)), slug }
    } catch (err) {
      if (err instanceof KidstoryApiError) {
        throw createError({ statusCode: err.statusCode, statusMessage: err.statusCode === 404 ? 'Story not found.' : err.message })
      }
      throw err
    }
  } else {
    const draft = body?.draft as Partial<WhatsAppStory> | undefined
    const paragraphs = Array.isArray(draft?.body) ? draft.body.filter((p): p is string => typeof p === 'string') : []
    if (!draft || typeof draft.title !== 'string' || !paragraphs.length) {
      throw createError({ statusCode: 400, statusMessage: 'Send a slug or a draft with a title and paragraphs.' })
    }
    story = { title: draft.title, emoji: String(draft.emoji ?? '📖'), excerpt: String(draft.excerpt ?? ''), body: paragraphs }
  }

  const messages = storyMessages(story, useRuntimeConfig().siteUrl || undefined)
  await sendToWhatsApp(messages)
  return { sent: messages.length, title: story.title }
})
