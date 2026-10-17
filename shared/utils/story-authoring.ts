// Framework-agnostic story-generation + publishing logic, shared between the
// Nitro `/studio` routes (server/api/studio/*.post.ts), the Vercel Cron route
// and the standalone scripts/daily-post.ts script, which runs outside the
// Nuxt/Nitro context and so can't use Nitro's auto-imported
// `useRuntimeConfig()`/`createError()`.
//
// Every story is written by kidstory-api's story agent (`POST /agents/story`,
// app/agents/story_agent.py), which looks at the catalog, writes the story and
// revises it until it passes the catalog's checks. The /studio chat and the
// unattended publishers all go through `createStoryWithAgent()`; the chat also
// sends the current draft and history so follow-ups revise the same story.
import { createStory, KidstoryApiError, runStoryAgent, type AgentStep, type KidstoryApiConfig } from './kidstory-api'

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

/**
 * Has the story agent write a story. `topic` is a premise to build on; left out,
 * the agent chooses one, and it chooses the category and age range itself unless
 * they're given. With `draft`, the agent revises it as `topic` asks instead;
 * `history` is the conversation so far, and the returned history includes this turn.
 */
export async function createStoryWithAgent(
  api: KidstoryApiConfig,
  {
    topic,
    category,
    ageRange,
    draft,
    history = []
  }: { topic?: string; category?: string; ageRange?: string; draft?: StoryDraft; history?: ChatMessage[] } = {}
): Promise<{ draft: StoryDraft; notes: string; steps: AgentStep[]; history: ChatMessage[] }> {
  // The API only accepts the category/age values it knows; an unknown one would
  // be a 422, so drop it rather than fail the call.
  try {
    return await runStoryAgent(api, {
      topic: topic?.trim() || undefined,
      category: CATEGORY_SLUGS.includes(category as any) ? category : undefined,
      ageRange: AGE_RANGES.includes(ageRange as any) ? ageRange : undefined,
      draft,
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
