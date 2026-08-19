import { Compass, Moon, PawPrint, Handshake, Wand2, Laugh, type LucideIcon } from '@lucide/vue'

export type CategorySlug =
  | 'adventure'
  | 'bedtime'
  | 'animals'
  | 'friendship'
  | 'fairy-tale'
  | 'funny'

export interface Category {
  slug: CategorySlug
  label: string
  icon: LucideIcon
  bg: string
}

export const categories: Category[] = [
  { slug: 'adventure', label: 'Adventure', icon: Compass, bg: 'bg-coral/15' },
  { slug: 'bedtime', label: 'Bedtime', icon: Moon, bg: 'bg-navy/10' },
  { slug: 'animals', label: 'Animals', icon: PawPrint, bg: 'bg-green/15' },
  { slug: 'friendship', label: 'Friendship', icon: Handshake, bg: 'bg-tan' },
  { slug: 'fairy-tale', label: 'Fairy Tales', icon: Wand2, bg: 'bg-coral/15' },
  { slug: 'funny', label: 'Funny Stories', icon: Laugh, bg: 'bg-green/15' }
]

export function getCategory(slug: CategorySlug): Category {
  return categories.find((c) => c.slug === slug) ?? categories[0]
}
