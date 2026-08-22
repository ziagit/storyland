import { Client } from '@gradio/client'

const AUDIO_BUCKET = 'story-audio'

let bucketReady: Promise<void> | null = null
let ttsClient: Promise<Client> | null = null

async function ensureAudioBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const supabase = useSupabaseAdmin()
      const { data: existing } = await supabase.storage.getBucket(AUDIO_BUCKET)
      if (!existing) {
        const { error } = await supabase.storage.createBucket(AUDIO_BUCKET, {
          public: true,
          fileSizeLimit: '20MB'
        })
        // Ignore a race where another request created it in the meantime.
        if (error && !/already exists/i.test(error.message)) {
          throw createError({ statusCode: 500, statusMessage: `Could not create Supabase storage bucket: ${error.message}` })
        }
      }
    })()
  }
  return bucketReady
}

async function getTtsClient(): Promise<Client> {
  const config = useRuntimeConfig()
  if (!config.huggingfaceSpaceUrl || !config.huggingfaceApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Hugging Face TTS Space is not configured on the server.' })
  }
  if (!ttsClient) {
    // Connecting with the owner's own HF token attributes ZeroGPU usage to
    // their account's free daily quota instead of the tiny shared anonymous one.
    ttsClient = Client.connect(config.huggingfaceSpaceUrl, {
      token: config.huggingfaceApiKey as `hf_${string}`
    }).catch((err) => {
      ttsClient = null
      throw err
    })
  }
  return ttsClient
}

async function callTtsSpace(text: string): Promise<Buffer> {
  const client = await getTtsClient()

  let result: { data: unknown }
  try {
    result = await client.predict('/generate', [text, ''])
  } catch (err: any) {
    const message = err?.message || 'Hugging Face TTS request failed.'
    throw createError({ statusCode: 502, statusMessage: message })
  }

  // The `narrate` function's gr.Audio output is returned as file metadata
  // with a fetchable `url`, not inline audio bytes.
  const output = Array.isArray(result.data) ? result.data[0] : result.data
  const audioUrl = (output as { url?: string } | null)?.url
  if (!audioUrl) {
    throw createError({ statusCode: 502, statusMessage: 'Hugging Face TTS Space returned no audio.' })
  }

  const audio = await $fetch<ArrayBuffer>(audioUrl, { responseType: 'arrayBuffer', timeout: 5 * 60 * 1000 })
  return Buffer.from(audio)
}

export async function generateAndStoreStoryAudio(story: { slug: string; body: string[] }): Promise<string> {
  const text = story.body.join('\n\n')
  const audioBuffer = await callTtsSpace(text)

  await ensureAudioBucket()
  const supabase = useSupabaseAdmin()
  const path = `${story.slug}.wav`

  const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(path, audioBuffer, {
    contentType: 'audio/wav',
    upsert: true
  })
  if (uploadError) {
    throw createError({ statusCode: 500, statusMessage: `Could not upload story audio: ${uploadError.message}` })
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path)

  const { error: updateError } = await supabase.from('stories').update({ audio_url: publicUrl }).eq('slug', story.slug)
  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: updateError.message })
  }

  return publicUrl
}
