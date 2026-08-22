// Deterministic, no-signup AI cover images via Pollinations.ai (https://pollinations.ai).
// Same slug always produces the same URL, so Pollinations serves a cached image on repeat views
// instead of re-generating. `safe=true` enables their NSFW filter, important for a kids' site.

function hashSeed(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash % 1_000_000
}

export function buildCoverImageUrl(story: { title: string; category: string; slug: string }): string {
  const prompt = [
    'flat 2D cartoon illustration',
    'children\'s picture book art style',
    'vector illustration, cel shaded',
    `${story.category} theme`,
    story.title,
    'cute soft rounded character design with big expressive eyes',
    'vibrant limited color palette',
    'bold flat colors, minimal shading',
    'simple background',
    'friendly and wholesome',
    'full bleed illustration',
    'no text',
    'no words',
    'no watermark',
    'no border',
    'no frame',
    'not 3D, not CGI, not a 3D render, not photorealistic',
    'no scary or dark elements'
  ].join(', ')

  const query = new URLSearchParams({
    width: '800',
    height: '600',
    seed: String(hashSeed(story.slug)),
    model: 'sana',
    nologo: 'true',
    safe: 'true'
  })

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${query.toString()}`
}
