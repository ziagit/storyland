// The /studio chat. Each message runs kidstory-api's story agent: the first one
// writes a new story, and follow-ups send the current draft back so the agent
// revises it ("make it shorter") rather than starting over.
import { createStoryWithAgent, StoryAuthoringError, type ChatMessage, type StoryDraft } from '../../../shared/utils/story-authoring'

interface GenerateBody {
  topic?: string
  category?: string
  ageRange?: string
  draft?: StoryDraft
  history?: ChatMessage[]
}

export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  const body = await readBody<GenerateBody>(event)
  const topic = body?.topic?.trim() ?? ''
  if (!topic) {
    throw createError({ statusCode: 400, statusMessage: 'A topic is required.' })
  }

  try {
    return await createStoryWithAgent(useKidstoryApi(), {
      topic,
      category: body?.category,
      ageRange: body?.ageRange,
      draft: body?.draft && typeof body.draft === 'object' ? body.draft : undefined,
      history: Array.isArray(body?.history) ? body.history : []
    })
  } catch (err) {
    if (err instanceof StoryAuthoringError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
