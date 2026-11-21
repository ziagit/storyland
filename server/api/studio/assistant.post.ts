// The Studio assistant, by voice or text. Each message runs kidstory-api's Studio
// assistant, which talks ideas through and has the story agent write or revise the
// draft. It never publishes or deletes: its `action` tells the page to read the draft
// aloud, publish it through /api/studio/publish (as the Publish button does), delete
// a published story through /api/admin/stories/[slug] (as the Stories page does), or
// send a story to the owner's WhatsApp through /api/studio/whatsapp.
import { KidstoryApiError, runStudioAssistant } from '../../../shared/utils/kidstory-api'
import { AGE_RANGES, CATEGORY_SLUGS, type ChatMessage, type StoryDraft } from '../../../shared/utils/story-authoring'

interface AssistantBody {
  message?: unknown
  history?: unknown
  draft?: unknown
  storyHistory?: unknown
  category?: unknown
  ageRange?: unknown
  voice?: unknown
}

function cleanHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((m): m is ChatMessage => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string' && m.content.trim() !== '')
    .slice(-12)
}

export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  const body = await readBody<AssistantBody>(event)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) {
    throw createError({ statusCode: 400, statusMessage: 'Say or type something first.' })
  }

  try {
    return await runStudioAssistant(useKidstoryApi(), {
      message: message.slice(0, 2000),
      history: cleanHistory(body?.history),
      draft: body?.draft && typeof body.draft === 'object' ? (body.draft as StoryDraft) : null,
      storyHistory: cleanHistory(body?.storyHistory),
      category: (CATEGORY_SLUGS as readonly string[]).includes(body?.category as string) ? (body!.category as string) : undefined,
      ageRange: (AGE_RANGES as readonly string[]).includes(body?.ageRange as string) ? (body!.ageRange as string) : undefined,
      voice: body?.voice === true
    })
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      const status = err.statusCode >= 500 && err.statusCode !== 503 ? 502 : err.statusCode
      throw createError({ statusCode: status, statusMessage: err.message })
    }
    throw err
  }
})
