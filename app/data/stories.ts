import { type CategorySlug } from './categories'

export type AgeRange = '3-5' | '6-8' | '9-12' | 'all-ages'

export interface Story {
  slug: string
  title: string
  emoji: string
  excerpt: string
  category: CategorySlug
  ageRange: AgeRange
  readTimeMinutes: number
  tags: string[]
  body: string[]
  coverImageUrl: string | null
  publishedAt: string
}

export function formatDate(story: Story): string {
  return new Date(story.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
