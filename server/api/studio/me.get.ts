// Lets the /studio page check, before rendering, that the signed-in user may use it.
export default defineEventHandler(async (event) => {
  const user = await requireStudioUser(event)
  return { email: user.email }
})
