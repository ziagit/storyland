// Framework-agnostic like story-authoring.ts and notify.ts — called from the Nitro
// /studio publish route, the Vercel Cron route and the standalone scripts/daily-post.ts.
//
// Facebook and Instagram posting is done by the social agent on kidstory-api
// (`POST /agents/social`, app/agents/social_agent.py): it reads the story, checks
// the accounts' recent posts, writes a post for each platform and publishes it. The
// platform tokens live on the API now. YouTube isn't part of the agent (its upload
// renders a video with ffmpeg) and is still posted from here — see youtube.ts.
import { runSocialAgent, type KidstoryApiConfig } from './kidstory-api'

/**
 * Shares a newly published story on Kidstory's social accounts via the social agent.
 * Never throws — a sharing failure should never block or fail the publish itself.
 */
export async function shareStoryOnSocial(api: KidstoryApiConfig, slug: string, siteUrl?: string): Promise<void> {
  try {
    const result = await runSocialAgent(api, { slug, siteUrl })
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
