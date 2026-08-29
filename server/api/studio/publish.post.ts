import { CATEGORY_SLUGS, AGE_RANGES, publishStoryDraft, StoryAuthoringError, type StoryDraft } from '../../../shared/utils/story-authoring'
import { sendNewStoryEmail, parseRecipients } from '../../../shared/utils/notify'
import { postStoryToFacebook } from '../../../shared/utils/facebook'

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

  const supabase = useSupabaseAdmin()
  try {
    const result = await publishStoryDraft(supabase, draft)
    // Never lets a notification failure fail the publish itself — sendNewStoryEmail
    // swallows its own errors (logged, not thrown).
    const config = useRuntimeConfig()
    const siteUrl = getRequestURL(event).origin
    await sendNewStoryEmail(
      { user: config.gmailUser, appPassword: config.gmailAppPassword },
      draft,
      result.slug,
      siteUrl,
      parseRecipients(config.notifyEmails)
    )
    await postStoryToFacebook(
      { pageId: config.facebookPageId, pageAccessToken: config.facebookPageAccessToken },
      draft,
      result.slug,
      siteUrl
    )
    return result
  } catch (err) {
    if (err instanceof StoryAuthoringError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
