export default defineEventHandler(async () => {
  const supabase = useSupabaseAdmin()

  const rows = seedStories.map((s) => {
    const publishedAt = new Date()
    publishedAt.setDate(publishedAt.getDate() - s.daysAgo)
    return {
      slug: s.slug,
      title: s.title,
      emoji: s.emoji,
      excerpt: s.excerpt,
      category: s.category,
      age_range: s.ageRange,
      read_time_minutes: s.readTimeMinutes,
      tags: s.tags,
      body: s.body,
      cover_image_url: buildCoverImageUrl({ title: s.title, category: s.category, slug: s.slug }),
      published_at: publishedAt.toISOString()
    }
  })

  const { error } = await supabase.from('stories').upsert(rows, { onConflict: 'slug' })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { seeded: rows.length }
})
