// Framework-agnostic like shared/utils/story-authoring.ts and notify.ts — called from
// the Nitro /studio publish route and from the standalone scripts/daily-post.ts script,
// which runs outside the Nuxt/Nitro context.
import dns from 'node:dns'
import type { StoryDraft } from './story-authoring'

// Same class of bug as the Gmail SMTP fix in notify.ts: this machine's DNS resolves
// graph.facebook.com to an IPv6 address first, but IPv6 isn't actually routable here,
// so fetch() failed with ENETUNREACH instead of falling back to IPv4. Node's fetch
// (undici) doesn't expose a per-call `family` option the way nodemailer does, but it
// does go through dns.lookup() under the hood, so switching the default resolution
// order fixes it globally for this process.
dns.setDefaultResultOrder('ipv4first')

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
