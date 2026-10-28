import { getBookDigest, KidstoryApiError } from '../../../shared/utils/kidstory-api'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required.' })
  }
  try {
    return await getBookDigest(useKidstoryApi(), slug)
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.statusCode === 404 ? 'Digest not found' : err.message })
    }
    throw err
  }
})
