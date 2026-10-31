import { deleteStory, KidstoryApiError } from '../../../../shared/utils/kidstory-api'

export default defineEventHandler(async (event) => {
  await requireStudioUser(event)
  try {
    await deleteStory(useKidstoryApi(), getRouterParam(event, 'slug') ?? '')
    return { deleted: true }
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
