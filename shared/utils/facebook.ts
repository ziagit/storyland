// Framework-agnostic like shared/utils/story-authoring.ts and notify.ts — called from
// the Nitro /studio publish route and from the standalone scripts/daily-post.ts script,
// which runs outside the Nuxt/Nitro context.
import type { StoryDraft } from './story-authoring'

const GRAPH_API_VERSION = 'v21.0'
const DEFAULT_SITE_URL = 'https://storyland-sigma.vercel.app'

export interface FacebookCredentials {
  pageId: string | undefined
  pageAccessToken: string | undefined
}

/**
 * Posts a new AI-published story to the Kidstory Facebook Page (message + a link back
 * to the story, which Facebook unfurls into a preview card using the page's Open Graph
 * tags). Never throws — a posting failure should never block or fail the publish itself.
 */
export async function postStoryToFacebook(
  credentials: FacebookCredentials,
  draft: StoryDraft,
  slug: string,
  siteUrl: string = DEFAULT_SITE_URL
): Promise<void> {
  if (!credentials.pageId || !credentials.pageAccessToken) {
    console.error('FACEBOOK_PAGE_ID/FACEBOOK_PAGE_ACCESS_TOKEN are not configured — skipping Facebook post.')
    return
  }

  try {
    const message = `${draft.title} ${draft.emoji}\n\n${draft.excerpt}`
    const link = `${siteUrl}/stories/${slug}`

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${credentials.pageId}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          link,
          access_token: credentials.pageAccessToken
        })
      }
    )

    if (!response.ok) {
      const errBody = await response.json().catch(() => null)
      console.error('Facebook rejected the story post:', errBody?.error?.message || response.status)
    }
  } catch (err) {
    console.error('Failed to post new story to Facebook:', err)
  }
}
