import { getStory, KidstoryApiError } from '../../../../shared/utils/kidstory-api'

export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  try {
    return await getStory(useKidstoryApi(), getRouterParam(event, 'slug') ?? '')
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
