// Keeps /admin for signed-in owners: anyone else is sent to /login. The server
// routes check the same thing (requireStudioUser), so this is about the pages, not security.
let verifiedToken: string | null = null

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || !to.path.startsWith('/admin')) return

  const { user, accessToken, whenReady } = useAuth()
  await whenReady()
  if (!user.value || !accessToken.value) {
    return navigateTo({ path: '/login', query: { next: to.fullPath } })
  }
  if (verifiedToken === accessToken.value) return

  try {
    await $fetch('/api/studio/me', { headers: { Authorization: `Bearer ${accessToken.value}` } })
    verifiedToken = accessToken.value
  } catch {
    return navigateTo({ path: '/login', query: { next: to.fullPath, denied: '1' } })
  }
})
