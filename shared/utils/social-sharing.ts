// Framework-agnostic like story-authoring.ts and notify.ts — called from the Nitro
// /studio publish route, the Vercel Cron route and the standalone scripts/daily-post.ts.
//
// All sharing is done by the social agent on kidstory-api (`POST /agents/social`,
// app/agents/social_agent.py): it reads the story, checks the accounts' recent
// posts, and writes and publishes a Facebook post and an Instagram caption. For a
// new story it also emails the owner a copy and uploads a cover video to YouTube
// (only where the API has ffmpeg). The tokens and Gmail password live on the API.
import { runSocialAgent, type KidstoryApiConfig } from './kidstory-api'

/**
 * Shares a newly published story (or, with `kind: 'books'`, a Book Picks digest) on
 * Kidstory's social accounts via the social agent.
 * Never throws — a sharing failure should never block or fail the publish itself.
 */
export async function shareStoryOnSocial(
  api: KidstoryApiConfig,
  slug: string,
  siteUrl?: string,
  kind: 'story' | 'books' = 'story'
): Promise<void> {
  try {
    const result = await runSocialAgent(api, { slug, siteUrl, kind })
    for (const post of result.posts) {
      if (post.status === 'posted') {
        console.log(`Social agent posted to ${post.platform} (${post.postId}).`)
      } else if (post.status === 'failed') {
        console.error(`Social agent could not post to ${post.platform}: ${post.error}`)
      } else {
        console.log(`Social agent skipped ${post.platform}: ${post.error ?? post.status}`)
      }
    }
  } catch (err: any) {
    console.error('Social agent failed:', err?.message ?? err)
  }
}
