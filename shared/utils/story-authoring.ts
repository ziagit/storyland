// Framework-agnostic story-generation + publishing logic, shared between the
// Nitro `/studio` routes (server/api/studio/*.post.ts), the Vercel Cron route
// and the standalone scripts/daily-post.ts script, which runs outside the
// Nuxt/Nitro context and so can't use Nitro's auto-imported
// `useRuntimeConfig()`/`createError()`.
//
// Generation runs on kidstory-api (`POST /stories/generate`), which calls
// Kidstory's own fine-tuned model — ziaflutter/tinyllama-cat-mouse-story, served
// from a Hugging Face Space. This module used to call OpenRouter directly; the
// prompt, the output parsing and the retry now live in the API's
// app/story_generator.py, so every client gets the same drafts.
import { createStory, generateStory, KidstoryApiError, type KidstoryApiConfig } from './kidstory-api'

export const CATEGORY_SLUGS = ['adventure', 'bedtime', 'animals', 'friendship', 'fairy-tale', 'funny'] as const
export const AGE_RANGES = ['3-5', '6-8', '9-12', 'all-ages'] as const

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StoryDraft {
  title: string
  emoji: string
  excerpt: string
  category: (typeof CATEGORY_SLUGS)[number]
  ageRange: (typeof AGE_RANGES)[number]
  readTimeMinutes: number
  tags: string[]
  body: string[]
}

export class StoryAuthoringError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

function toAuthoringError(err: unknown): unknown {
  if (err instanceof KidstoryApiError) {
    // The API's own 4xx codes are meaningful to the caller (400 bad topic, 401
    // key, 503 model not configured); anything else server-side is relayed as 502.
    const status = err.statusCode >= 500 && err.statusCode !== 503 ? 502 : err.statusCode
    return new StoryAuthoringError(status, err.message)
  }
  return err
}

export async function generateStoryDraft(
  api: KidstoryApiConfig,
  { topic, category, ageRange, history = [] }: { topic: string; category?: string; ageRange?: string; history?: ChatMessage[] }
): Promise<{ draft: StoryDraft; history: ChatMessage[] }> {
  if (!topic.trim()) {
    throw new StoryAuthoringError(400, 'A topic is required.')
  }

  // The API only accepts the category/age values it knows; an unknown one from
  // the studio's selects would be a 422, so drop it rather than fail the call.
  const knownCategory = CATEGORY_SLUGS.includes(category as any) ? category : undefined
  const knownAgeRange = AGE_RANGES.includes(ageRange as any) ? ageRange : undefined

  try {
    return await generateStory(api, {
      topic: topic.trim(),
      category: knownCategory,
      ageRange: knownAgeRange,
      history: history.slice(-12)
    })
  } catch (err) {
    throw toAuthoringError(err)
  }
}

export async function publishStoryDraft(api: KidstoryApiConfig, draft: StoryDraft): Promise<{ slug: string }> {
  // The API derives the slug (with `-2`/`-3`… on collision), the cover image URL
  // and `publishedAt`, and defaults new stories to premium — same rules that used
  // to live here, now enforced in one place for every client.
  try {
    const story = await createStory(api, draft)
    return { slug: story.slug }
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      throw new StoryAuthoringError(err.statusCode >= 500 ? 500 : err.statusCode, err.message)
    }
    throw err
  }
}
