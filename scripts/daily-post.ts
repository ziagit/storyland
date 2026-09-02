// Unattended story generator. Primary scheduling is now Vercel Cron
// (server/api/cron/daily-post.get.ts); this script is the manual fallback,
// runnable by hand (`npm run auto-post`) or via the workflow_dispatch trigger
// in .github/workflows/auto-post.yml. It runs outside the Nuxt/Nitro context —
// invoked via `npx tsx scripts/daily-post.ts`, so it can't use Nitro's
// auto-imported `useRuntimeConfig()`/`createError()` and builds its own Supabase
// client instead of reusing server/utils/supabase.ts. Reuses the same
// generate/publish/topic logic as /studio and the cron route so all paths stay
// in sync. Unlike the Vercel route it also posts to YouTube (ffmpeg renders
// fine here; on Vercel it can exceed the serverless bundle/time limits).
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { generateStoryDraft, publishStoryDraft, StoryAuthoringError } from '../shared/utils/story-authoring'
import { sendNewStoryEmail, parseRecipients } from '../shared/utils/notify'
import { postStoryToFacebook } from '../shared/utils/facebook'
import { postStoryToInstagram } from '../shared/utils/instagram'
import { postStoryToYouTube } from '../shared/utils/youtube'
import { pickAutoPostTopic, recordUsedTopic } from '../shared/utils/auto-post'

const envPath = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(envPath)) {
  process.loadEnvFile(envPath)
}

const {
  OPENROUTER_API_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
  SITE_URL,
  NOTIFY_EMAILS,
  FACEBOOK_PAGE_ID,
  FACEBOOK_PAGE_ACCESS_TOKEN,
  INSTAGRAM_ACCOUNT_ID,
  INSTAGRAM_ACCESS_TOKEN,
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  YOUTUBE_REFRESH_TOKEN
} = process.env

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

async function main() {
  const picked = await pickAutoPostTopic(supabase)
  console.log(`Topic: ${picked.recordAs ?? '(model-invented, pool exhausted)'}`)

  const { draft } = await generateStoryDraft(OPENROUTER_API_KEY, {
    topic: picked.topic,
    category: picked.category
  })

  const { slug } = await publishStoryDraft(supabase, draft)
  console.log(`Published "${draft.title}" -> /stories/${slug}`)

  // Record the topic right after a successful publish, before the best-effort
  // social posts, so an interrupted run can't cause a duplicate topic next time.
  await recordUsedTopic(supabase, picked.recordAs ?? draft.title)

  await sendNewStoryEmail({ user: GMAIL_USER, appPassword: GMAIL_APP_PASSWORD }, draft, slug, SITE_URL, parseRecipients(NOTIFY_EMAILS))
  await postStoryToFacebook({ pageId: FACEBOOK_PAGE_ID, pageAccessToken: FACEBOOK_PAGE_ACCESS_TOKEN }, draft, slug, SITE_URL)
  await postStoryToInstagram({ accountId: INSTAGRAM_ACCOUNT_ID, accessToken: INSTAGRAM_ACCESS_TOKEN }, draft, slug, SITE_URL)
  await postStoryToYouTube(
    { clientId: YOUTUBE_CLIENT_ID, clientSecret: YOUTUBE_CLIENT_SECRET, refreshToken: YOUTUBE_REFRESH_TOKEN },
    draft,
    slug,
    SITE_URL
  )
}

main().catch((err) => {
  if (err instanceof StoryAuthoringError) {
    console.error(`[${err.statusCode}] ${err.message}`)
  } else {
    console.error(err)
  }
  process.exit(1)
})
