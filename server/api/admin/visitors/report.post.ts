import { KidstoryApiError, runVisitorsAgent } from '../../../../shared/utils/kidstory-api'

// Asks the visitors agent for a report on the visit numbers, or to answer the
// owner's question about them. One Claude run, so only on the owner's click.
export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  const body = await readBody<{ days?: unknown; question?: unknown }>(event)
  const days = Number(body?.days ?? 7)
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw createError({ statusCode: 400, statusMessage: 'days must be between 1 and 90.' })
  }
  const question = typeof body?.question === 'string' ? body.question.trim().slice(0, 500) : ''
  try {
    return await runVisitorsAgent(useKidstoryApi(), { days, question: question || undefined })
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
