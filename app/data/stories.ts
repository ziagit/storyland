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
  isPremium: boolean
  /** True when the API withheld the full body because the reader hasn't unlocked this premium story. */
  locked: boolean
  /** Only present when locked: true — total paragraph count, for "N more paragraphs" style UI. */
  lockedBodyCount?: number
}

export function formatDate(story: Story): string {
  return new Date(story.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
