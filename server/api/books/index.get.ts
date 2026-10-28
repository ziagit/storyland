import { KidstoryApiError, listBookDigests } from '../../../shared/utils/kidstory-api'

// Book Picks digests, newest first, without their text (the books agent on
// kidstory-api writes one a day). Always free to read.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const offset = Number(query.offset) > 0 ? Number(query.offset) : 0
  try {
    return await listBookDigests(useKidstoryApi(), { limit: 24, offset })
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
