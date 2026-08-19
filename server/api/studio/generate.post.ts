const CATEGORY_SLUGS = ['adventure', 'bedtime', 'animals', 'friendship', 'fairy-tale', 'funny'] as const
const AGE_RANGES = ['3-5', '6-8', '9-12', 'all-ages'] as const

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface GenerateBody {
  topic?: string
  category?: string
  ageRange?: string
  history?: ChatMessage[]
}

interface StoryDraft {
  title: string
  emoji: string
  excerpt: string
  category: (typeof CATEGORY_SLUGS)[number]
  ageRange: (typeof AGE_RANGES)[number]
  readTimeMinutes: number
  tags: string[]
  body: string[]
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
    throw createError({ statusCode: 502, statusMessage: 'OpenRouter returned an incomplete story. Please try again.' })
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

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.openrouterApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'OPENROUTER_API_KEY is not configured on the server.' })
  }

  const body = await readBody<GenerateBody>(event)
  const topic = body?.topic?.trim()
  if (!topic) {
    throw createError({ statusCode: 400, statusMessage: 'A topic is required.' })
  }

  const history = Array.isArray(body.history) ? body.history.slice(-12) : []
  const hint = [
    body.category ? `Preferred category: ${body.category}.` : '',
    body.ageRange ? `Preferred age range: ${body.ageRange}.` : ''
  ]
    .filter(Boolean)
    .join(' ')

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: hint ? `${topic}\n\n${hint}` : topic }
  ]

  let completion: { choices?: { message?: { content?: string } }[] }
  try {
    completion = await $fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kidstory.app',
        'X-Title': 'Kidstory Studio'
      },
      body: {
        model: 'google/gemma-4-26b-a4b-it:free',
        messages,
        temperature: 0.85,
        max_tokens: 1200,
        response_format: { type: 'json_object' }
      }
    })
  } catch (err: any) {
    const message = err?.data?.error?.message || err?.message || 'OpenRouter request failed.'
    throw createError({ statusCode: 502, statusMessage: message })
  }

  const rawContent = completion.choices?.[0]?.message?.content
  if (!rawContent) {
    throw createError({ statusCode: 502, statusMessage: 'OpenRouter returned an empty response.' })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'OpenRouter returned invalid JSON.' })
  }

  const draft = sanitizeDraft(parsed)

  return {
    draft,
    history: [
      ...history,
      { role: 'user', content: hint ? `${topic}\n\n${hint}` : topic },
      { role: 'assistant', content: rawContent }
    ] satisfies ChatMessage[]
  }
})
