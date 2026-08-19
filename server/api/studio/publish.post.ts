const CATEGORY_SLUGS = ['adventure', 'bedtime', 'animals', 'friendship', 'fairy-tale', 'funny']
const AGE_RANGES = ['3-5', '6-8', '9-12', 'all-ages']

interface PublishBody {
  title?: string
  emoji?: string
  excerpt?: string
  category?: string
  ageRange?: string
  readTimeMinutes?: number
  tags?: string[]
  body?: string[]
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return base || 'new-story'
}

export default defineEventHandler(async (event) => {
  const body = await readBody<PublishBody>(event)

  const title = String(body?.title ?? '').trim()
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required.' })
  }

  const excerpt = String(body?.excerpt ?? '').trim()
  const storyBody = Array.isArray(body?.body)
    ? body.body.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    : []
  if (!excerpt || !storyBody.length) {
    throw createError({ statusCode: 400, statusMessage: 'Story excerpt and body are required.' })
  }

  const category = CATEGORY_SLUGS.includes(body?.category ?? '') ? body!.category : 'adventure'
  const ageRange = AGE_RANGES.includes(body?.ageRange ?? '') ? body!.ageRange : 'all-ages'
  const emoji = String(body?.emoji ?? '').trim() || '✨'
  const readTimeMinutes = Math.min(5, Math.max(1, Math.round(Number(body?.readTimeMinutes)) || 2))
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 4)
    : []

  const supabase = useSupabaseAdmin()
  const base = slugify(title)
  let slug = base

  for (let attempt = 1; attempt <= 20; attempt++) {
    const { error } = await supabase.from('stories').insert({
      slug,
      title,
      emoji,
      excerpt,
      category,
      age_range: ageRange,
      read_time_minutes: readTimeMinutes,
      tags,
      body: storyBody,
      cover_image_url: buildCoverImageUrl({ title, category: category!, slug }),
      published_at: new Date().toISOString()
    })

    if (!error) {
      return { slug }
    }
    if (error.code === '23505') {
      slug = `${base}-${attempt + 1}`
      continue
    }
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  throw createError({ statusCode: 500, statusMessage: 'Could not generate a unique slug.' })
})
