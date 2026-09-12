import { getStory, KidstoryApiError } from '../../../shared/utils/kidstory-api'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required.' })
  }

  // The paywall is enforced by the API: a premium story comes back with only its
  // teaser paragraph plus `locked: true` unless the forwarded reader token maps
  // to an entitlement. Nothing to redact here.
  try {
    return await getStory(useKidstoryApi(), slug, getReaderToken(event))
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.statusCode === 404 ? 'Story not found' : err.message })
    }
    throw err
  }
})
