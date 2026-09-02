// Unattended daily story publish, triggered by Vercel Cron (see vercel.json).
// Does what scripts/daily-post.ts does — pick an unused topic, generate a story,
// publish it, then email the owner and post to Facebook + Instagram — but as a
// Nitro route so it runs on the deployment itself instead of GitHub Actions.
//
// YouTube is deliberately NOT wired here: rendering a video needs ffmpeg-static
// (~80 MB, can blow Vercel's serverless bundle limit) and the render + upload is
// slow enough to risk the Hobby-plan 60s function cap. YouTube auto-post stays
// available from /studio publish and the manual GitHub Actions fallback.
import { generateStoryDraft, publishStoryDraft, StoryAuthoringError } from '../../../shared/utils/story-authoring'
import { sendNewStoryEmail, parseRecipients } from '../../../shared/utils/notify'
import { postStoryToFacebook } from '../../../shared/utils/facebook'
import { postStoryToInstagram } from '../../../shared/utils/instagram'
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

  const supabase = useSupabaseAdmin()

  try {
    const picked = await pickAutoPostTopic(supabase)
    const { draft } = await generateStoryDraft(config.openrouterApiKey, {
      topic: picked.topic,
      category: picked.category
    })

    const { slug } = await publishStoryDraft(supabase, draft)

    // Record the topic immediately after a successful publish — before the
    // best-effort social posts — so a mid-run timeout (Hobby caps functions at
    // 60s) can't leave the topic unrecorded and cause tomorrow's run to
    // regenerate the same premise.
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
    await postStoryToFacebook(
      { pageId: config.facebookPageId, pageAccessToken: config.facebookPageAccessToken },
      draft,
      slug,
      siteUrl
    )
    await postStoryToInstagram(
      { accountId: config.instagramAccountId, accessToken: config.instagramAccessToken },
      draft,
      slug,
      siteUrl
    )

    return { ok: true, published: slug, title: draft.title }
  } catch (err) {
    if (err instanceof StoryAuthoringError) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.message })
    }
    throw err
  }
})
