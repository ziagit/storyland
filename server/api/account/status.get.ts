export default defineEventHandler(async (event) => {
  const user = await getUserFromEvent(event)
  if (!user) {
    return { signedIn: false, email: null, hasAccess: false }
  }

  const hasAccess = await hasFullAccess(user.id)
  return { signedIn: true, email: user.email, hasAccess }
})
