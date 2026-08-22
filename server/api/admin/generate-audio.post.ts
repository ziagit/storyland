interface GenerateAudioBody {
  slug?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<GenerateAudioBody>(event)
  const slug = body?.slug?.trim()
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'slug is required.' })
  }

  const supabase = useSupabaseAdmin()
  const { data: story, error } = await supabase.from('stories').select('slug, body').eq('slug', slug).single()

  if (error || !story) {
    throw createError({ statusCode: 404, statusMessage: 'Story not found.' })
  }

  const audioUrl = await generateAndStoreStoryAudio(story as { slug: string; body: string[] })

  return { slug, audioUrl }
})
