export default defineEventHandler(async () => {
  const supabase = useSupabasePublic()
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .order('published_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return (data ?? []).map((row) => mapStoryRow(row as StoryRow))
})
