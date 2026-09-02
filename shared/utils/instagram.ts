// Framework-agnostic like shared/utils/facebook.ts and notify.ts — called from the
// Nitro /studio publish route and from the standalone scripts/daily-post.ts script,
// which runs outside the Nuxt/Nitro context.
import dns from 'node:dns'
import { buildCoverImageUrl } from '../../server/utils/cover-image'
import type { StoryDraft } from './story-authoring'

// Same IPv6 ENETUNREACH issue as facebook.ts / the Gmail SMTP fix: this machine
// resolves graph.facebook.com to an unroutable IPv6 address first, and Node's fetch
// (undici) has no per-call `family` option, so switch the process-wide resolution
// order. Harmless if facebook.ts already called this.
dns.setDefaultResultOrder('ipv4first')

const GRAPH_API_VERSION = 'v21.0'
const DEFAULT_SITE_URL = 'https://storyland-sigma.vercel.app'

// Instagram's Content Publishing API creates a media "container" asynchronously, then
// publishes it. For a single image the container is almost always ready immediately,
// but poll a few times just in case rather than failing on a transient "not ready".
const CONTAINER_POLL_ATTEMPTS = 6
const CONTAINER_POLL_DELAY_MS = 2000

export interface InstagramCredentials {
  accountId: string | undefined
  accessToken: string | undefined
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function buildCaption(draft: StoryDraft, link: string): string {
  return [
    `${draft.title} ${draft.emoji}`.trim(),
    '',
    draft.excerpt,
    '',
    `📖 Read the full story: ${link}`,
    '(tap the link in our bio)',
    '',
    '#storiesforkids #bedtimestories #kidlit #kidsbooks #readingtime'
  ].join('\n')
}

/**
 * Posts a new AI-published story to the Kidstory Instagram account (@kidstory64) as a
 * single-image feed post: the story's cover image with a caption. Unlike Facebook,
 * Instagram requires media on every post and its caption links aren't tappable, so the
 * story URL is included as plain text plus a "link in bio" nudge.
 *
 * Never throws — a posting failure should never block or fail the publish itself.
 */
export async function postStoryToInstagram(
  credentials: InstagramCredentials,
  draft: StoryDraft,
  slug: string,
  siteUrl: string = DEFAULT_SITE_URL
): Promise<void> {
  if (!credentials.accountId || !credentials.accessToken) {
    console.error('INSTAGRAM_ACCOUNT_ID/INSTAGRAM_ACCESS_TOKEN are not configured — skipping Instagram post.')
    return
  }

  const base = `https://graph.facebook.com/${GRAPH_API_VERSION}/${credentials.accountId}`
  const token = credentials.accessToken

  try {
    // Recompute the cover URL from the same three inputs publishStoryDraft() uses, so
    // this stays self-contained (mirrors what notify.ts does for the email image).
    const imageUrl = buildCoverImageUrl({ title: draft.title, category: draft.category, slug })
    const caption = buildCaption(draft, `${siteUrl}/stories/${slug}`)

    // Step 1 — create the media container.
    const createRes = await fetch(`${base}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: token })
    })
    const createBody = await createRes.json().catch(() => null)
    if (!createRes.ok || !createBody?.id) {
      console.error('Instagram rejected the media container:', createBody?.error?.message || createRes.status)
      return
    }
    const containerId = createBody.id as string

    // Step 2 — wait for the container to finish processing.
    let ready = false
    for (let attempt = 0; attempt < CONTAINER_POLL_ATTEMPTS; attempt++) {
      const statusRes = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${containerId}?fields=status_code&access_token=${token}`
      )
      const statusBody = await statusRes.json().catch(() => null)
      const code = statusBody?.status_code
      if (code === 'FINISHED') {
        ready = true
        break
      }
      if (code === 'ERROR' || code === 'EXPIRED') {
        console.error(`Instagram media container ${code} — skipping Instagram post.`)
        return
      }
      await sleep(CONTAINER_POLL_DELAY_MS)
    }
    if (!ready) {
      console.error('Instagram media container never reached FINISHED — skipping Instagram post.')
      return
    }

    // Step 3 — publish the container.
    const publishRes = await fetch(`${base}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: token })
    })
    const publishBody = await publishRes.json().catch(() => null)
    if (!publishRes.ok || !publishBody?.id) {
      console.error('Instagram rejected media_publish:', publishBody?.error?.message || publishRes.status)
    }
  } catch (err) {
    console.error('Failed to post new story to Instagram:', err)
  }
}
