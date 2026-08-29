export default defineEventHandler(async () => {
  const supabase = useSupabasePublic()
  // Body is intentionally omitted here — the listing/card views never render it, and
  // fetching it for every story would leak the full text of paywalled stories to
  // anyone browsing /stories, regardless of whether they've paid.
  const { data, error } = await supabase
    .from('stories')
    .select('slug, title, emoji, excerpt, category, age_range, read_time_minutes, tags, cover_image_url, audio_url, published_at, is_premium')
    .order('published_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return (data ?? []).map((row) => mapStoryRow(row as StoryRow))
})
