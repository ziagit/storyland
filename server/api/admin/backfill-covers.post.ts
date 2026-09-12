import { listAllStories, updateStory, KidstoryApiError } from '../../../shared/utils/kidstory-api'

export default defineEventHandler(async () => {
  const api = useKidstoryApi()

  try {
    // The listing has no "cover is null" filter, so fetch the catalog and pick
    // the gaps here — it's a handful of summaries, not the story bodies.
    const missing = (await listAllStories(api)).filter((story) => !story.coverImageUrl)

    for (const story of missing) {
      await updateStory(api, story.slug, {
        coverImageUrl: buildCoverImageUrl({ title: story.title, category: story.category, slug: story.slug })
      })
    }

    return { backfilled: missing.length }
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
