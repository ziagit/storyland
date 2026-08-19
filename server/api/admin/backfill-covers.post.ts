export default defineEventHandler(async () => {
  const supabase = useSupabaseAdmin()

  const { data, error } = await supabase.from('stories').select('slug, title, category').is('cover_image_url', null)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const rows = data ?? []
  for (const row of rows) {
    const { error: updateError } = await supabase
      .from('stories')
      .update({ cover_image_url: buildCoverImageUrl(row as { slug: string; title: string; category: string }) })
      .eq('slug', row.slug)

    if (updateError) {
      throw createError({ statusCode: 500, statusMessage: updateError.message })
    }
  }

  return { backfilled: rows.length }
})
