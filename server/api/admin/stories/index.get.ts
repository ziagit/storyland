import { listAllStories, KidstoryApiError } from '../../../../shared/utils/kidstory-api'

// The admin panel's catalog: every story summary, newest first, optionally filtered.
export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  const query = getQuery(event)
  const pick = (key: string) => (typeof query[key] === 'string' && query[key] ? String(query[key]) : undefined)

  try {
    return await listAllStories(useKidstoryApi(), { category: pick('category'), ageRange: pick('ageRange'), q: pick('q') })
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
