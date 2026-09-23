// Throwaway: one-time UNLISTED test upload to confirm channel + pipeline. Delete after.
import { createReadStream } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import ffmpeg from 'fluent-ffmpeg'
import { google } from 'googleapis'

process.loadEnvFile(join(import.meta.dirname, '..', '.env'))
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

const story = {
  title: 'The Meadow Race',
  emoji: '🐇',
  category: 'animals',
  slug: 'the-meadow-race',
  excerpt: 'When Rabbit and Turtle decide to race to the hilltop, they discover that the best part of the journey is sharing it together.',
  tags: ['rabbit', 'turtle', 'friendship']
}

function hashSeed(input) {
  let hash = 0
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  return hash % 1_000_000
}
function buildCoverImageUrl(s) {
  const prompt = [
    'flat 2D cartoon illustration', "children's picture book art style",
    'vector illustration, cel shaded', `${s.category} theme`, s.title,
    'cute soft rounded character design with big expressive eyes',
    'vibrant limited color palette', 'bold flat colors, minimal shading',
    'simple background', 'friendly and wholesome', 'full bleed illustration',
    'no text', 'no words', 'no watermark', 'no border', 'no frame',
    'not 3D, not CGI, not a 3D render, not photorealistic', 'no scary or dark elements'
  ].join(', ')
  const q = new URLSearchParams({ width: '800', height: '600', seed: String(hashSeed(s.slug)), model: 'sana', nologo: 'true', safe: 'true' })
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${q}`
}

const dir = await mkdtemp(join(tmpdir(), 'yt-test-'))
try {
  console.log('fetching cover…')
  const res = await fetch(buildCoverImageUrl(story))
  console.log('cover status', res.status)
  const imgPath = join(dir, 'cover.jpg')
  await writeFile(imgPath, Buffer.from(await res.arrayBuffer()))

  const videoPath = join(dir, 'story.mp4')
  console.log('rendering video…')
  await new Promise((resolve, reject) => {
    ffmpeg(imgPath)
      .inputOptions(['-loop 1'])
      .videoFilters([
        'scale=1920:1080:force_original_aspect_ratio=decrease',
        'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white',
        'format=yuv420p'
      ])
      .outputOptions(['-t', '25', '-r', '25', '-c:v', 'libx264', '-preset', 'veryfast'])
      .on('end', resolve).on('error', reject).save(videoPath)
  })

  const oauth2 = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET)
  oauth2.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN })
  const youtube = google.youtube({ version: 'v3', auth: oauth2 })

  console.log('uploading (unlisted)…')
  const up = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: `${story.title} ${story.emoji} [test]`.slice(0, 100),
        description: `${story.excerpt}\n\nRead the full story: https://storyland-sigma.vercel.app/stories/${story.slug}`,
        tags: story.tags,
        categoryId: '24'
      },
      status: { privacyStatus: 'unlisted', selfDeclaredMadeForKids: true }
    },
    media: { body: createReadStream(videoPath) }
  })

  const v = up.data
  console.log('\n=== UPLOAD OK ===')
  console.log('video id     :', v.id)
  console.log('channel title:', v.snippet?.channelTitle)
  console.log('channel id   :', v.snippet?.channelId)
  console.log('privacy      :', v.status?.privacyStatus)
  console.log('watch URL    : https://www.youtube.com/watch?v=' + v.id)
} finally {
  await rm(dir, { recursive: true, force: true }).catch(() => {})
}
