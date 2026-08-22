export default defineEventHandler(async () => {
  const supabase = useSupabaseAdmin()

  const { data, error } = await supabase.from('stories').select('slug, body').is('audio_url', null)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const rows = (data ?? []) as { slug: string; body: string[] }[]
  for (const row of rows) {
    await generateAndStoreStoryAudio(row)
  }

  return { backfilled: rows.length }
})
