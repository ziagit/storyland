import { listAgentActivity, KidstoryApiError } from '../../../shared/utils/kidstory-api'

// Recent agent runs for the dashboard's live agent machine, polled every few
// seconds. `now` is this server's clock, so the page can time each animation
// against the runs' server-side timestamps instead of the viewer's own clock.
export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  try {
    const runs = await listAgentActivity(useKidstoryApi(), 600)
    return { now: new Date().toISOString(), runs }
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
