// Framework-agnostic like shared/utils/facebook.ts and instagram.ts — called from the
// Nitro /studio publish route and from the standalone scripts/daily-post.ts script.
//
// YouTube needs OAuth 2.0 (not a permanent token): a Google Cloud project with the
// YouTube Data API v3 enabled, an OAuth client, and a long-lived refresh token for the
// channel owner's account (the OAuth app must be published to "Production" or the
// refresh token expires after 7 days). See SOCIAL-SETUP.md.
import dns from 'node:dns'
import { createReadStream } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import ffmpeg from 'fluent-ffmpeg'
import { google } from 'googleapis'
import { buildCoverImageUrl } from '../../server/utils/cover-image'
import type { StoryDraft } from './story-authoring'

// Same IPv6 ENETUNREACH reason as facebook.ts / instagram.ts.
dns.setDefaultResultOrder('ipv4first')

const DEFAULT_SITE_URL = 'https://storyland-sigma.vercel.app'
const VIDEO_SECONDS = 25
// '24' = Entertainment. Every upload is flagged made-for-kids (COPPA) since this is a
// children's story channel.
const YT_CATEGORY_ID = '24'

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

export interface YouTubeCredentials {
  clientId: string | undefined
  clientSecret: string | undefined
  refreshToken: string | undefined
}

/** Render a silent ~25s 1080p MP4 of the story's cover image (letterboxed, no crop). */
async function renderCoverVideo(imageUrl: string, dir: string): Promise<string> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`cover image fetch failed: ${res.status}`)
  const imgPath = join(dir, 'cover.jpg')
  await writeFile(imgPath, Buffer.from(await res.arrayBuffer()))

  const outPath = join(dir, 'story.mp4')
  await new Promise<void>((resolve, reject) => {
    ffmpeg(imgPath)
      .inputOptions(['-loop 1'])
      .videoFilters([
        'scale=1920:1080:force_original_aspect_ratio=decrease',
        'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white',
        'format=yuv420p'
      ])
      .outputOptions(['-t', String(VIDEO_SECONDS), '-r', '25', '-c:v', 'libx264', '-preset', 'veryfast'])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outPath)
  })
  return outPath
}

/**
 * Publishes a new AI story to the Kidstory YouTube channel: a silent slideshow video of
 * the story's cover image, with the story's title/excerpt/link as the video metadata.
 * Never throws — an upload failure should never block or fail the publish itself.
 *
 * Note: video rendering needs ffmpeg (bundled via ffmpeg-static). This works from the
 * GitHub Actions auto-post job and local /studio, but may exceed the serverless bundle
 * size limit on Vercel — a failure there is logged and skipped like any other.
 */
export async function postStoryToYouTube(
  credentials: YouTubeCredentials,
  draft: StoryDraft,
  slug: string,
  siteUrl: string = DEFAULT_SITE_URL
): Promise<void> {
  if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
    console.error('YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET/YOUTUBE_REFRESH_TOKEN are not configured — skipping YouTube upload.')
    return
  }

  let dir: string | null = null
  try {
    dir = await mkdtemp(join(tmpdir(), 'kidstory-yt-'))
    const imageUrl = buildCoverImageUrl({ title: draft.title, category: draft.category, slug })
    const videoPath = await renderCoverVideo(imageUrl, dir)

    const oauth2 = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret)
    oauth2.setCredentials({ refresh_token: credentials.refreshToken })
    const youtube = google.youtube({ version: 'v3', auth: oauth2 })

    const link = `${siteUrl}/stories/${slug}`
    await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: `${draft.title} ${draft.emoji}`.trim().slice(0, 100),
          description: `${draft.excerpt}\n\nRead the full story: ${link}`.slice(0, 4900),
          tags: draft.tags?.slice(0, 10),
          categoryId: YT_CATEGORY_ID
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: true
        }
      },
      media: { body: createReadStream(videoPath) }
    })
  } catch (err) {
    console.error('Failed to upload new story to YouTube:', err)
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
