import { updateStory, KidstoryApiError, type StoryUpdateInput } from '../../../../shared/utils/kidstory-api'
import { CATEGORY_SLUGS, AGE_RANGES, type StoryDraft } from '../../../../shared/utils/story-authoring'

// Saves the admin panel's story editor. Only the fields the editor shows are
// passed on; the API validates the rest (title clashes, lengths).
export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  const body = await readBody<Record<string, unknown>>(event)
  const text = (key: string) => String(body?.[key] ?? '').trim()
  const lines = (key: string) =>
    Array.isArray(body?.[key]) ? (body[key] as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim()) : []

  const changes: StoryUpdateInput = {}
  if (text('title')) changes.title = text('title')
  if (text('emoji')) changes.emoji = text('emoji')
  if (text('excerpt')) changes.excerpt = text('excerpt')
  if ((CATEGORY_SLUGS as readonly string[]).includes(text('category'))) changes.category = text('category') as StoryDraft['category']
  if ((AGE_RANGES as readonly string[]).includes(text('ageRange'))) changes.ageRange = text('ageRange') as StoryDraft['ageRange']
  if (Number(body?.readTimeMinutes) > 0) changes.readTimeMinutes = Math.min(5, Math.round(Number(body.readTimeMinutes)))
  if (Array.isArray(body?.tags)) changes.tags = lines('tags').slice(0, 4)
  if (Array.isArray(body?.body)) {
    const paragraphs = lines('body')
    if (!paragraphs.length) {
      throw createError({ statusCode: 400, statusMessage: 'A story needs at least one paragraph.' })
    }
    changes.body = paragraphs
  }
  if ('coverImageUrl' in (body ?? {})) changes.coverImageUrl = text('coverImageUrl') || null

  try {
    return await updateStory(useKidstoryApi(), getRouterParam(event, 'slug') ?? '', changes)
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
