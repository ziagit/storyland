import { listAllStories, KidstoryApiError } from '../../../shared/utils/kidstory-api'

export default defineEventHandler(async (event) => {
  // Optional filters pass straight through to the API; with none, this is the
  // full newest-first catalog the pages have always consumed. The API never
  // returns body text from its listing, so paywalled stories can't leak here.
  const query = getQuery(event)
  const pick = (key: string) => (typeof query[key] === 'string' && query[key] ? String(query[key]) : undefined)

  try {
    return await listAllStories(useKidstoryApi(), {
      category: pick('category'),
      ageRange: pick('ageRange'),
      tag: pick('tag'),
      q: pick('q')
    })
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
