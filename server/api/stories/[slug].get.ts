export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required.' })
  }

  const supabase = useSupabasePublic()
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Story not found' })
  }

  const story = mapStoryRow(data as StoryRow)
  if (!story.isPremium) {
    return story
  }

  const user = await getUserFromEvent(event)
  const unlocked = user ? await hasFullAccess(user.id) : false
  if (unlocked) {
    return story
  }

  // Paywalled and not entitled: keep the teaser paragraph, withhold the rest.
  return {
    ...story,
    body: story.body.slice(0, 1),
    locked: true,
    lockedBodyCount: story.body.length
  }
})
