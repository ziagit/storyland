import { generateStoryDraft, StoryAuthoringError, type ChatMessage } from '../../../shared/utils/story-authoring'

interface GenerateBody {
  topic?: string
  category?: string
  ageRange?: string
  history?: ChatMessage[]
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<GenerateBody>(event)
  const topic = body?.topic?.trim() ?? ''

  try {
    const result = await generateStoryDraft(config.openrouterApiKey, {
      topic,
      category: body?.category,
      ageRange: body?.ageRange,
      history: Array.isArray(body?.history) ? body.history : []
    })
    return result
  } catch (err) {
    if (err instanceof StoryAuthoringError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
