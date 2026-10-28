// Unattended daily Book Picks digest, triggered by Vercel Cron (see vercel.json).
// kidstory-api's books agent searches the web for current children's bestseller
// lists and publishes a digest; then the social agent shares it on Facebook and
// Instagram. Runs at a different hour from /api/cron/daily-post so the two
// don't compete for the same function time.
import { KidstoryApiError, runBooksAgent } from '../../../shared/utils/kidstory-api'
import { shareStoryOnSocial } from '../../../shared/utils/social-sharing'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Same guard as daily-post: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
  const auth = getHeader(event, 'authorization')
  if (!config.cronSecret || auth !== `Bearer ${config.cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const api = useKidstoryApi()
  let result
  try {
    result = await runBooksAgent(api)
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
  console.log(`Books agent: ${result.notes}`)

  // Never throws: a sharing failure leaves the published digest in place.
  // siteUrl must be the public origin, since Facebook fetches the link.
  await shareStoryOnSocial(api, result.digest.slug, config.siteUrl || getRequestURL(event).origin, 'books')

  return { ok: true, published: result.digest.slug, title: result.digest.title }
})
