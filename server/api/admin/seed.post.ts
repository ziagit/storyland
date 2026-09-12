import { createStory, updateStory, KidstoryApiError } from '../../../shared/utils/kidstory-api'
import type { StoryDraft } from '../../../shared/utils/story-authoring'

export default defineEventHandler(async () => {
  const api = useKidstoryApi()

  // The API has no upsert, so each seed story is created with its fixed slug and,
  // if that slug already exists (409), patched in place instead — same end state
  // as the old `upsert(..., { onConflict: 'slug' })`.
  let seeded = 0
  for (const s of seedStories) {
    const publishedAt = new Date()
    publishedAt.setDate(publishedAt.getDate() - s.daysAgo)
    const fields = {
      title: s.title,
      emoji: s.emoji,
      excerpt: s.excerpt,
      category: s.category as StoryDraft['category'],
      ageRange: s.ageRange as StoryDraft['ageRange'],
      readTimeMinutes: s.readTimeMinutes,
      tags: s.tags,
      body: s.body,
      publishedAt: publishedAt.toISOString()
    }

    try {
      await createStory(api, { ...fields, slug: s.slug })
    } catch (err) {
      if (err instanceof KidstoryApiError && err.statusCode === 409) {
        await updateStory(api, s.slug, fields).catch(rethrowAsHttp)
      } else {
        rethrowAsHttp(err)
      }
    }
    seeded++
  }

  return { seeded }
})

function rethrowAsHttp(err: unknown): never {
  if (err instanceof KidstoryApiError) {
    throw createError({ statusCode: err.statusCode, statusMessage: err.message })
  }
  throw err
}
