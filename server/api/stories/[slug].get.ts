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

  return mapStoryRow(data as StoryRow)
})
