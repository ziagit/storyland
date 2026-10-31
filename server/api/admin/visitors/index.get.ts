import { getVisitorStats, KidstoryApiError } from '../../../../shared/utils/kidstory-api'

// The admin Visitors page's numbers: visitors and time on the site for the last
// `days` days (7, 30 or 90), from what the visit tracker recorded.
export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  const days = Number(getQuery(event).days ?? 30)
  if (![7, 30, 90].includes(days)) {
    throw createError({ statusCode: 400, statusMessage: 'days must be 7, 30 or 90.' })
  }
  try {
    return await getVisitorStats(useKidstoryApi(), days)
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
