// Framework-agnostic story-generation + publishing logic, shared between the
// Nitro `/studio` routes (server/api/studio/*.post.ts) and the standalone
// scripts/daily-post.ts script, which runs outside the Nuxt/Nitro context and
// so can't use Nitro's auto-imported `useRuntimeConfig()`/`createError()`.
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildCoverImageUrl } from '../../server/utils/cover-image'

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

function sanitizeDraft(raw: unknown): StoryDraft {
  const d = raw as Record<string, unknown>
  const title = typeof d?.title === 'string' && d.title.trim() ? d.title.trim() : 'Untitled Story'
  const emoji = typeof d?.emoji === 'string' && d.emoji.trim() ? d.emoji.trim() : '✨'
  const excerpt = typeof d?.excerpt === 'string' ? d.excerpt.trim() : ''
  const category = CATEGORY_SLUGS.includes(d?.category as any) ? (d.category as StoryDraft['category']) : 'adventure'
  const ageRange = AGE_RANGES.includes(d?.ageRange as any) ? (d.ageRange as StoryDraft['ageRange']) : 'all-ages'
  const readTimeMinutes = Math.min(5, Math.max(1, Math.round(Number(d?.readTimeMinutes)) || 2))
  const tags = Array.isArray(d?.tags)
    ? (d.tags as unknown[]).filter((t): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 4)
    : []
  const body = Array.isArray(d?.body)
    ? (d.body as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    : []

  if (!excerpt || !body.length) {
    throw new StoryAuthoringError(502, 'OpenRouter returned an incomplete story. Please try again.')
  }

  return { title, emoji, excerpt, category, ageRange, readTimeMinutes, tags, body }
}

const SYSTEM_PROMPT = `You are the in-house storyteller for Kidstory, a blog of short, gentle stories for kids ages 3-12.

Write ONE short story based on the user's topic or instructions, in a warm, simple, age-appropriate voice:
- 2-3 short paragraphs
- a kind, brave, or curious main character (an animal, a kid, or a friendly magical creature)
- a gentle conflict resolved through kindness, courage, sharing, or curiosity — a light, implicit lesson, never preachy or scary
- nothing violent, frightening, or inappropriate for young children

If the user is asking for changes to a story you already wrote earlier in this conversation, revise that story instead of starting a new one, and return the full updated story.

Respond with ONLY a JSON object, no commentary, in exactly this shape:
{
  "title": string,
  "emoji": string (one single emoji representing the story),
  "excerpt": string (one inviting sentence, no spoilers of the ending),
  "category": one of ${JSON.stringify(CATEGORY_SLUGS)},
  "ageRange": one of ${JSON.stringify(AGE_RANGES)},
  "readTimeMinutes": integer between 1 and 3,
  "tags": array of 2-3 short lowercase one-or-two-word tags,
  "body": array of 2-3 short paragraph strings (the story text)
}`

async function callOpenRouterOnce(openrouterApiKey: string, messages: unknown[]): Promise<string> {
  let response: Response
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kidstory.app',
        'X-Title': 'Kidstory Studio'
      },
      body: JSON.stringify({
        // Reasoning is mandatory for this model (can't be disabled via the `reasoning`
        // param) and consumes several hundred tokens of the budget before the actual
        // JSON — max_tokens must leave headroom for both, not just the story itself.
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages,
        temperature: 0.85,
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      })
    })
  } catch (err: any) {
    throw new StoryAuthoringError(502, err?.message || 'OpenRouter request failed.')
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => null)
    throw new StoryAuthoringError(502, errBody?.error?.message || `OpenRouter request failed (${response.status}).`)
  }

  const completion = (await response.json()) as { choices?: { message?: { content?: string } }[] }
  const rawContent = completion.choices?.[0]?.message?.content
  if (!rawContent) {
    throw new StoryAuthoringError(502, 'OpenRouter returned an empty response.')
  }

  return rawContent
}

export async function generateStoryDraft(
  openrouterApiKey: string | undefined,
  { topic, category, ageRange, history = [] }: { topic: string; category?: string; ageRange?: string; history?: ChatMessage[] }
): Promise<{ draft: StoryDraft; history: ChatMessage[] }> {
  if (!openrouterApiKey) {
    throw new StoryAuthoringError(500, 'OPENROUTER_API_KEY is not configured.')
  }
  if (!topic.trim()) {
    throw new StoryAuthoringError(400, 'A topic is required.')
  }

  const trimmedHistory = history.slice(-12)
  const hint = [category ? `Preferred category: ${category}.` : '', ageRange ? `Preferred age range: ${ageRange}.` : '']
    .filter(Boolean)
    .join(' ')
  const userMessage = hint ? `${topic}\n\n${hint}` : topic

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...trimmedHistory, { role: 'user', content: userMessage }]

  // The free model occasionally returns malformed/non-JSON content or an empty
  // response — observed as a real, transient failure (an identical retry of the
  // same request succeeded moments later), not a persistent config/auth problem.
  // One retry absorbs that without surfacing a spurious error to the user/script.
  const maxAttempts = 2
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let rawContent: string
    try {
      rawContent = await callOpenRouterOnce(openrouterApiKey, messages)
      const draft = sanitizeDraft(JSON.parse(rawContent))
      return {
        draft,
        history: [...trimmedHistory, { role: 'user', content: userMessage }, { role: 'assistant', content: rawContent }]
      }
    } catch (err) {
      lastError = err instanceof SyntaxError ? new StoryAuthoringError(502, 'OpenRouter returned invalid JSON.') : err
      if (attempt < maxAttempts) continue
    }
  }

  throw lastError
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

export async function publishStoryDraft(supabase: SupabaseClient, draft: StoryDraft): Promise<{ slug: string }> {
  const base = slugify(draft.title)
  let slug = base

  for (let attempt = 1; attempt <= 20; attempt++) {
    const { error } = await supabase.from('stories').insert({
      slug,
      title: draft.title,
      emoji: draft.emoji,
      excerpt: draft.excerpt,
      category: draft.category,
      age_range: draft.ageRange,
      read_time_minutes: draft.readTimeMinutes,
      tags: draft.tags,
      body: draft.body,
      cover_image_url: buildCoverImageUrl({ title: draft.title, category: draft.category, slug }),
      published_at: new Date().toISOString()
    })

    if (!error) {
      return { slug }
    }
    if (error.code === '23505') {
      slug = `${base}-${attempt + 1}`
      continue
    }
    throw new StoryAuthoringError(500, error.message)
  }

  throw new StoryAuthoringError(500, 'Could not generate a unique slug.')
}
