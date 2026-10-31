import { CATEGORY_SLUGS, AGE_RANGES, publishStoryDraft, StoryAuthoringError, type StoryDraft } from '../../../shared/utils/story-authoring'
import { shareStoryOnSocial } from '../../../shared/utils/social-sharing'

interface PublishBody {
  title?: string
  emoji?: string
  excerpt?: string
  category?: string
  ageRange?: string
  readTimeMinutes?: number
  tags?: string[]
  body?: string[]
}

export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  const body = await readBody<PublishBody>(event)

  const title = String(body?.title ?? '').trim()
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required.' })
  }

  const excerpt = String(body?.excerpt ?? '').trim()
  const storyBody = Array.isArray(body?.body)
    ? body.body.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    : []
  if (!excerpt || !storyBody.length) {
    throw createError({ statusCode: 400, statusMessage: 'Story excerpt and body are required.' })
  }

  const draft: StoryDraft = {
    title,
    emoji: String(body?.emoji ?? '').trim() || '✨',
    excerpt,
    category: (CATEGORY_SLUGS as readonly string[]).includes(body?.category ?? '')
      ? (body!.category as StoryDraft['category'])
      : 'adventure',
    ageRange: (AGE_RANGES as readonly string[]).includes(body?.ageRange ?? '')
      ? (body!.ageRange as StoryDraft['ageRange'])
      : 'all-ages',
    readTimeMinutes: Math.min(5, Math.max(1, Math.round(Number(body?.readTimeMinutes)) || 2)),
    tags: Array.isArray(body?.tags) ? body.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 4) : [],
    body: storyBody
  }

  const api = useKidstoryApi()
  try {
    const result = await publishStoryDraft(api, draft)
    const config = useRuntimeConfig()
    // The social agent shares the story everywhere: Facebook, Instagram, the
    // owner's email and YouTube (where the API has ffmpeg). Pass only an explicit
    // SITE_URL: a localhost origin is no use in a post or an email link, and the
    // API falls back to its own SITE_URL. Never throws, so a sharing failure
    // can't fail the publish.
    await shareStoryOnSocial(api, result.slug, config.siteUrl || undefined)
    return result
  } catch (err) {
    if (err instanceof StoryAuthoringError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
