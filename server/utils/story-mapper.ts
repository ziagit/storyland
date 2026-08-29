export interface StoryRow {
  slug: string
  title: string
  emoji: string
  excerpt: string
  category: string
  age_range: string
  read_time_minutes: number
  tags: string[]
  body?: string[]
  cover_image_url: string | null
  audio_url: string | null
  published_at: string
  is_premium: boolean
}

export function mapStoryRow(row: StoryRow) {
  return {
    slug: row.slug,
    title: row.title,
    emoji: row.emoji,
    excerpt: row.excerpt,
    category: row.category,
    ageRange: row.age_range,
    readTimeMinutes: row.read_time_minutes,
    tags: row.tags ?? [],
    body: row.body ?? [],
    coverImageUrl: row.cover_image_url ?? null,
    audioUrl: row.audio_url ?? null,
    publishedAt: row.published_at,
    isPremium: row.is_premium ?? false,
    locked: false
  }
}
