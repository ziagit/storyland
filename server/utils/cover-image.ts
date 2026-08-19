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
    "children's book illustration",
    `${story.category} theme`,
    story.title,
    'flat vector art',
    'soft pastel colors',
    'warm and gentle',
    'cute',
    'simple',
    'friendly',
    'no text',
    'no words',
    'no scary elements'
  ].join(', ')

  const query = new URLSearchParams({
    width: '800',
    height: '600',
    seed: String(hashSeed(story.slug)),
    model: 'flux',
    nologo: 'true',
    safe: 'true'
  })

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${query.toString()}`
}
