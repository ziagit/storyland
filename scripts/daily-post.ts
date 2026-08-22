// Unattended story generator, run on a schedule (see .github/workflows/auto-post.yml,
// every 12 hours) outside the Nuxt/Nitro context — invoked directly via
// `npx tsx scripts/daily-post.ts`, so it can't use Nitro's auto-imported
// `useRuntimeConfig()`/`createError()` and builds its own Supabase client instead
// of reusing server/utils/supabase.ts. Reuses the same generate/publish logic as
// /studio (shared/utils/story-authoring.ts) so both paths stay in sync.
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { generateStoryDraft, publishStoryDraft, StoryAuthoringError } from '../shared/utils/story-authoring'
import { TOPIC_POOL } from '../shared/utils/topic-pool'

const envPath = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(envPath)) {
  process.loadEnvFile(envPath)
}

const { OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

if (!OPENROUTER_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing required environment variables. Need OPENROUTER_API_KEY, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY.'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws as unknown as typeof WebSocket }
})

const normalize = (topic: string) => topic.trim().toLowerCase()

async function pickTopic(): Promise<{ topic: string; category?: string; recordAs: string | null }> {
  const { data, error } = await supabase
    .from('used_topics')
    .select('topic')
    .order('used_at', { ascending: false })
    .limit(300)
  if (error) {
    throw new Error(`Could not read used_topics: ${error.message}`)
  }

  const used = new Set((data ?? []).map((row) => normalize(row.topic as string)))
  const available = TOPIC_POOL.filter((entry) => !used.has(normalize(entry.topic)))

  if (available.length > 0) {
    const picked = available[Math.floor(Math.random() * available.length)]
    return { topic: picked.topic, category: picked.category, recordAs: picked.topic }
  }

  // The whole seed pool has been used at least once — ask the model to invent
  // something new rather than repeating. Cap the avoid-list so the prompt
  // doesn't grow without bound as more fallback topics accumulate over time.
  const avoidList = [...used].slice(0, 150).join('; ')
  const topic = `Invent one brand-new, original short story idea for kids (in your head, do not restate it) that is completely different from all of these previously used story topics and titles: ${avoidList}. Then write that story.`
  return { topic, category: undefined, recordAs: null }
}

async function main() {
  const picked = await pickTopic()
  console.log(`Topic: ${picked.recordAs ?? '(model-invented, pool exhausted)'}`)

  const { draft } = await generateStoryDraft(OPENROUTER_API_KEY, {
    topic: picked.topic,
    category: picked.category
  })

  const { slug } = await publishStoryDraft(supabase, draft)
  console.log(`Published "${draft.title}" -> /stories/${slug}`)

  const topicToRecord = picked.recordAs ?? draft.title
  const { error: insertError } = await supabase.from('used_topics').insert({ topic: topicToRecord })
  if (insertError && insertError.code !== '23505') {
    console.warn(`Could not record used topic "${topicToRecord}": ${insertError.message}`)
  }
}

main().catch((err) => {
  if (err instanceof StoryAuthoringError) {
    console.error(`[${err.statusCode}] ${err.message}`)
  } else {
    console.error(err)
  }
  process.exit(1)
})
