// Keeps /studio for signed-in owners: anyone else is sent to /login. The server
// routes check the same thing (requireStudioUser), so this is about the page, not security.
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const { user, accessToken, whenReady } = useAuth()
  await whenReady()
  if (!user.value || !accessToken.value) {
    return navigateTo({ path: '/login', query: { next: '/studio' } })
  }

  try {
    await $fetch('/api/studio/me', { headers: { Authorization: `Bearer ${accessToken.value}` } })
  } catch {
    return navigateTo({ path: '/login', query: { next: '/studio', denied: '1' } })
  }
})
