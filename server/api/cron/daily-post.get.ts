// Unattended daily story publish, triggered by Vercel Cron (see vercel.json).
// Does what scripts/daily-post.ts does — the story agent writes a story, it's
// published, the owner is emailed, and the social agent shares it on Facebook +
// Instagram — but as a Nitro route so it runs on the deployment itself instead
// of GitHub Actions. Both agents run on kidstory-api.
//
// YouTube is deliberately NOT wired here: rendering a video needs ffmpeg-static
// (~80 MB, can blow Vercel's serverless bundle limit) and the render + upload is
// slow enough to risk the function time limit. YouTube auto-post stays
// available from /studio publish and the manual GitHub Actions fallback.
import { createStoryWithAgent, publishStoryDraft, StoryAuthoringError } from '../../../shared/utils/story-authoring'
import { sendNewStoryEmail, parseRecipients } from '../../../shared/utils/notify'
import { shareStoryOnSocial } from '../../../shared/utils/social-sharing'
import { pickAutoPostTopic, recordUsedTopic } from '../../../shared/utils/auto-post'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET is
  // set as an env var. Reject anything else so the route can't be triggered by
  // a random GET to the public URL.
  const auth = getHeader(event, 'authorization')
  if (!config.cronSecret || auth !== `Bearer ${config.cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Topic bookkeeping (`used_topics`) has no kidstory-api route, so it still
  // talks to Supabase directly; the story is generated and published through the API.
  const supabase = useSupabaseAdmin()
  const api = useKidstoryApi()

  try {
    const picked = await pickAutoPostTopic(supabase)
    // An unused premise from the pool steers the agent; once the pool is used up
    // (recordAs is null) it chooses its own instead of retelling an old one.
    const { draft, notes } = await createStoryWithAgent(api, {
      topic: picked.recordAs ? picked.topic : undefined,
      category: picked.recordAs ? picked.category : undefined
    })
    console.log(`Story agent: ${notes}`)

    const { slug } = await publishStoryDraft(api, draft)

    // Record the topic immediately after a successful publish — before the
    // best-effort social posts — so a mid-run timeout can't leave the topic
    // unrecorded and cause tomorrow's run to regenerate the same premise.
    await recordUsedTopic(supabase, picked.recordAs ?? draft.title)

    // siteUrl must be the deployed, publicly-reachable origin: Facebook fetches
    // the link to build a preview card and rejects anything it can't reach.
    const siteUrl = config.siteUrl || getRequestURL(event).origin

    // None of these throw — each logs and returns on failure — so one failing
    // channel never blocks the others or the 200 response.
    await sendNewStoryEmail(
      { user: config.gmailUser, appPassword: config.gmailAppPassword },
      draft,
      slug,
      siteUrl,
      parseRecipients(config.notifyEmails)
    )
    await shareStoryOnSocial(api, slug, siteUrl)

    return { ok: true, published: slug, title: draft.title }
  } catch (err) {
    if (err instanceof StoryAuthoringError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
