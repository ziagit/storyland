// Topic selection for unattended auto-publishing, shared between the Vercel Cron
// route (server/api/cron/daily-post.get.ts) and the standalone script
// (scripts/daily-post.ts) so the "never repeat a topic" logic can't drift
// between the two entry points.
import type { SupabaseClient } from '@supabase/supabase-js'
import { TOPIC_POOL } from './topic-pool'

const normalize = (topic: string) => topic.trim().toLowerCase()

export interface PickedTopic {
  topic: string
  category?: string
  // What to write into `used_topics` on success: the pool entry's premise, or
  // null when the pool is exhausted (caller records the generated title instead).
  recordAs: string | null
}

/**
 * Picks a story premise not yet used. Prefers an unused entry from the curated
 * pool (random among those remaining); once the whole pool has been used at
 * least once, asks the model to invent a fresh one, steering it away from a
 * bounded slice of everything used so far.
 */
export async function pickAutoPostTopic(supabase: SupabaseClient): Promise<PickedTopic> {
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

  const avoidList = [...used].slice(0, 150).join('; ')
  const topic = `Invent one brand-new, original short story idea for kids (in your head, do not restate it) that is completely different from all of these previously used story topics and titles: ${avoidList}. Then write that story.`
  return { topic, category: undefined, recordAs: null }
}

/**
 * Records a topic as used. A duplicate-key error (23505) is ignored — the topic
 * is already recorded, which is the desired end state.
 */
export async function recordUsedTopic(supabase: SupabaseClient, topic: string): Promise<void> {
  const { error } = await supabase.from('used_topics').insert({ topic })
  if (error && error.code !== '23505') {
    console.warn(`Could not record used topic "${topic}": ${error.message}`)
  }
}
