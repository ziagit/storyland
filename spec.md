# Kidstory — Project Specification

**A blog for short stories for kids**
Version 1.0 · Draft for review

---

## 1. Overview

| | |
|---|---|
| **Project name** | Kidstory |
| **Tagline** | "Short Stories for Kids" |
| **Purpose** | A blog where short stories for kids are published and read |
| **Audience** | Kids of all ages (and the parents/guardians/teachers browsing with or for them) |
| **Tech stack** | Nuxt 4 + Tailwind CSS |
| **Content management** | Stories stored in a Supabase Postgres database (public read via anon key, writes via service-role key only), plus an unlisted AI-assisted authoring tool (`/studio`) that publishes new stories straight into the database — see §3.6 |
| **Visual reference** | Attached sample design (warm, illustrated, editorial blog layout) |
| **Logo** | Provided (`logo.png`) — circular mark + wordmark + tagline lockup |

---

## 2. Brand & Design System

### 2.1 Logo
- Circular badge: open book + heart, on a solid green circle.
- Wordmark "kidstory" in a bold, rounded, lowercase sans-serif (navy).
- Tagline "SHORT STORIES FOR KIDS" in small green letter-spaced caps.
- Provide 3 logo variants for implementation:
  - Full lockup (icon + wordmark + tagline) — homepage hero / footer
  - Icon + wordmark only — header nav
  - Icon only (favicon / mobile app icon / loading state)

### 2.2 Color Palette
Derived from the logo, applied the same way the reference design applies its palette (soft cream background, one deep navy, one forest green, one warm accent):

| Token | Hex (approx.) | Usage |
|---|---|---|
| `--color-navy` | `#1B3B5F` | Headings, primary text, nav links |
| `--color-green` | `#2F6F58` | Primary buttons, category icons, links, tagline text |
| `--color-coral` | `#E36656` | Accent/heart motif, hover states, badges, highlights |
| `--color-cream` | `#FBF3E3` | Page background |
| `--color-tan` | `#E9DAB8` | Card backgrounds, section backgrounds, secondary surfaces |
| `--color-white` | `#FFFFFF` | Cards, form fields |
| `--color-ink-muted` | `#5B5347` | Body copy, meta text (dates, read time) |

### 2.3 Typography
- **Headings:** Bold, rounded serif or slab-serif (matches the friendly, storybook feel in the reference — e.g. "Fraunces", "Poppins" fallback for a more playful geometric option). Large, confident sizes on hero.
- **Body:** Clean, highly legible sans-serif (e.g. "Inter" / "Nunito" — Nunito's rounded terminals suit a kids' site).
- **Story text (reading view):** Larger base size (18–20px), generous line-height (1.7+), dyslexia-friendly option toggle (stretch goal, see §7).

### 2.4 Shape & Style Language
- Soft, rounded corners throughout (cards `rounded-2xl`/`rounded-3xl`, buttons `rounded-full`).
- Pill-shaped buttons with icon + label (matches "Explore Articles →" / "About This Blog ♡" in reference).
- Hand-drawn/illustrated accents: sparkle marks, small heart icons, leafy corner illustrations — used sparingly as decoration, not photography.
- Circular icon badges (tinted background circle + line icon) for category navigation, matching the reference's category row.
- Card shadows: soft, low-opacity, warm-toned (not pure black) to keep the cozy feel.

### 2.5 Illustration Style
- Kidstory should use a **children's-book illustration style** (flat/painterly, warm palette, friendly characters) rather than the reference's semi-realistic style — appropriate for the younger audience. Placeholder illustration credits/sourcing to be confirmed (see Open Questions).

---

## 3. Site Structure / Pages

### 3.1 Home (`/`)
Modeled closely on the reference layout:
1. **Header/Nav** — logo (icon+wordmark), links: Home / Stories / About / Contact, search icon, "Subscribe" pill button. Sticky on scroll.
2. **Hero section** — big friendly headline (e.g. "Big Adventures, Little Readers."), short supporting line, two CTA buttons ("Read Stories →" / "About Kidstory ♡"), illustrated hero artwork (kids reading together).
3. **Category strip** — row of circular icon badges + labels (e.g. Adventure, Bedtime, Animals, Friendship, Fairy Tales, Funny Stories) — clickable, filters the Stories page.
4. **Featured Stories** — 4-card grid: cover illustration, category tag, title, short excerpt, "X min read" + age hint, favorite/heart icon.
5. **About This Blog** teaser card + **Subscribe/Newsletter** card side-by-side (mirrors reference's two-card row).
6. **Popular Tags** — pill row (e.g. Kindness, Courage, Magic, Family, Animals, Curiosity).
7. **Closing banner** — inspirational pull-quote for kids + illustration + "Start Reading" CTA.
8. **Footer** — logo, nav links, social icons, copyright.

### 3.2 Stories (`/stories`)
- Grid/list of all stories, each card: illustration, title, category badge, excerpt, read time, recommended age range.
- Filters: by category (from the icon strip) and by age range (e.g. 3–5, 6–8, 9–12, All Ages).
- Simple search bar.
- Pagination or "Load more."

### 3.3 Story detail (`/stories/[slug]`)
- Large title, illustration/banner, category + age badge, read time.
- Story body in the enhanced reading typography.
- Read-aloud audio toggle ("Listen"/"Pause") next to Share, playing a pre-generated narration file when available; font-size control.
- "Next story" / "More like this" recommendations at the end.
- Share and favorite buttons.

### 3.4 About (`/about`)
- Mission/story of Kidstory (why it exists), matching the reference's warm "About This Blog" tone but expanded.
- Illustrated author/team section.
- Values row (e.g. Kindness, Imagination, Curiosity, Safety) using the same circular icon-badge style as the category strip.

### 3.5 Contact (`/contact`)
- Friendly intro copy.
- Contact form: name, email, message (client-side validated; submit handler to be defined — see Open Questions on backend/email delivery).
- Optional: social links, simple FAQ.

### 3.6 Studio (`/studio`) — internal authoring tool
- Unlisted page (not linked from nav/footer, no auth) for the site owner to draft new stories with an AI model and publish them.
- Chat-style flow: enter a topic (+ optional category/age hint) → the AI drafts a story → owner can ask for changes in follow-up messages → "Publish" inserts the finished story as a new row in the Supabase `stories` table with a generated slug.
- Server-side only: the OpenRouter API key and the Supabase service-role key both live in `runtimeConfig` (never sent to the client); a Nitro server route calls OpenRouter and another inserts the accepted draft into Supabase.
- Works on read-only/serverless production hosts, since publishing is a database write rather than a filesystem write.

### 3.7 Automated publishing
- A new story is generated and published unattended every 12 hours, on top of (not replacing) manual `/studio` use — see §8 for the mechanism.
- Topics are drawn from a curated seed pool (`shared/utils/topic-pool.ts`, ~60 premises spread across the six categories) without repeats, tracked via a Supabase `used_topics` table; once the pool is exhausted the script asks the model to invent a fresh topic distinct from everything used so far.
- Automated posts do not trigger read-aloud narration generation (unlike `/studio` publish) — narration remains manual/backfill-only, since the Hugging Face ZeroGPU quota is small and shared with the existing backfill job (see §8).

---

## 4. Component Inventory (Nuxt + Tailwind)

Reusable components to build:

- `AppHeader.vue` — nav, logo, mobile menu (animated slide/fade)
- `AppFooter.vue`
- `HeroSection.vue`
- `CategoryBadge.vue` — icon + label, used in strip and filters
- `StoryCard.vue` — used in Featured grid and Stories listing
- `TagPill.vue`
- `NewsletterCard.vue`
- `AboutTeaserCard.vue`
- `QuoteBanner.vue`
- `Button.vue` — primary (filled pill), secondary (outline pill), supports icon slot
- `SearchBar.vue`
- `FilterBar.vue` (category + age filter for Stories page)
- `ContactForm.vue`
- `ReadingProgressBar.vue` (stretch, story detail)
- `FavoriteButton.vue` (heart toggle, matches logo motif)

---

## 5. Content Data Model (Supabase)

Stories live in a single Supabase table, `public.stories` (schema in `supabase/schema.sql`), with a consistent shape:

```ts
{
  slug: string          // primary key
  title: string
  emoji: string          // per-story cover emoji (see StoryCover.vue)
  excerpt: string
  category: 'adventure' | 'bedtime' | 'animals' | 'friendship' | 'fairy-tale' | 'funny'
  age_range: '3-5' | '6-8' | '9-12' | 'all-ages'
  read_time_minutes: number
  tags: string[]
  body: string[]          // one paragraph per array entry
  cover_image_url: string | null
  audio_url: string | null  // pre-generated read-aloud narration (Supabase Storage), null until generated
  published_at: timestamptz
}
```

The public site reads via Nitro server routes (`server/api/stories/*.get.ts`) using the Supabase anon key, guarded by a read-only Row Level Security policy. Writes (from `/studio`) use the service-role key server-side only, which bypasses RLS. Categories remain a small hardcoded list in `app/data/categories.ts` (tied to Lucide icon components, which don't serialize well to a DB row).

---

## 6. Animation & Interactivity

Since the brief calls for "some animation for interactiveness," and the reference design is fairly static, Kidstory should feel more alive:

- **Hero:** gentle floating/parallax motion on illustration elements (e.g. birds, sparkles drifting), fade+slide-in on headline load.
- **Category badges & buttons:** hover scale-up + soft shadow lift; pressed/tap state bounce (springy, kid-friendly easing).
- **Story cards:** hover lift + illustration slight zoom; heart/favorite icon does a small "pop" animation on click.
- **Page transitions:** soft fade/slide between routes (Nuxt `<transition>` / view transitions).
- **Scroll reveal:** sections fade/slide up into view as the user scrolls (Featured Stories, Category strip, Popular Tags).
- **Newsletter/Contact form:** success state with a small celebratory animation (confetti or bouncing heart) on submit.
- **Mobile nav:** animated slide-in drawer.
- Keep motion tasteful and not overwhelming; respect `prefers-reduced-motion`.

Implementation: Tailwind transition utilities + `@vueuse/motion` (or CSS keyframes) for scroll-reveal and hero motion; avoid heavy animation libraries unless needed.

---

## 7. Open Questions / Decisions Needed

1. **Story categories** — please confirm the final category list (I proposed: Adventure, Bedtime, Animals, Friendship, Fairy Tales, Funny Stories).
2. **Age ranges** — confirm the age bands to filter by (proposed: 3–5, 6–8, 9–12, All Ages), or should stories simply be untagged by age since "any age" is the goal?
3. **Illustrations** — will you supply story illustrations, or should these be AI-generated/stock placeholders for v1?
4. **Contact form backend** — since there's no CMS/backend planned, how should submissions be handled (e.g. a form service like Formspree, an email API, or just a `mailto:` link)?
5. **Newsletter** — is this a real subscription (needs an email service like Mailchimp/ConvertKit) or a placeholder for now?
6. ~~**Read-aloud/audio narration**~~ — resolved: in scope for v1. Every story gets pre-generated narration audio via a self-hosted Qwen3-TTS model on Hugging Face Spaces; see §8.
7. **Number of launch stories** — how many stories should be ready at launch, to size the homepage/Stories page properly?
8. **Domain/deployment target** — e.g. Vercel/Netlify — any preference?

---

## 8. Tech Notes

- **Framework:** Nuxt 4, using the new `app/` directory structure, file-based routing (`pages/`), auto-imported components.
- **Styling:** Tailwind CSS with a custom theme (`tailwind.config.ts`) mapping the color tokens in §2.2, custom `fontFamily`, and `borderRadius` scale tuned for the rounded aesthetic.
- **Images:** `@nuxt/image` for optimized, responsive illustration/cover images.
- **SEO:** Nuxt's built-in `useSeoMeta` per page/story; Open Graph image per story for social sharing.
- **Accessibility:** semantic headings, alt text on all illustrations, keyboard-navigable nav/filters, color contrast checked against the cream/tan backgrounds, `prefers-reduced-motion` respected.
- **Responsiveness:** mobile-first; category strip and story grid collapse to horizontal scroll / single column on small screens.
- **AI story authoring:** `/studio` calls the OpenRouter chat completions API (`google/gemma-4-26b-a4b-it:free`, JSON mode) from Nitro server routes (`server/api/studio/generate.post.ts`, `server/api/studio/publish.post.ts`). `OPENROUTER_API_KEY` is read from `.env` via Nuxt `runtimeConfig` (private, server-only — never exposed to the client). Publishing inserts a new row into the Supabase `stories` table.
- **Database:** Supabase (Postgres) via `@supabase/supabase-js`. `SUPABASE_URL` + `SUPABASE_ANON_KEY` are public (`runtimeConfig.public`, used for read-only queries from Nitro routes, protected by an RLS read policy); `SUPABASE_SERVICE_ROLE_KEY` is private/server-only (`runtimeConfig`, used for writes from `/studio` and the one-time seed route). Schema lives in `supabase/schema.sql`; run it once in the Supabase SQL Editor to create the `stories` table.
- **Read-aloud narration:** every story's audio is pre-generated (never live on a reader's request) by `Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice`, self-hosted on a free-tier Hugging Face Space (Gradio SDK on ZeroGPU — Hugging Face no longer offers free CPU/Docker compute Spaces; source in `huggingface-space/`). `server/utils/tts.ts`'s `generateAndStoreStoryAudio()` calls the Space's `generate` Gradio API endpoint via `@gradio/client`, uploads the resulting WAV to a public Supabase Storage bucket (`story-audio`), and saves the public URL on the story's `audio_url` column. Triggered per-story after `/studio` publish (`server/api/admin/generate-audio.post.ts`) and via a rerunnable batch job for stories missing audio (`server/api/admin/backfill-audio.post.ts`). `HUGGINGFACE_SPACE_URL` (the Space id, e.g. `username/space-name`) and `HUGGINGFACE_API_KEY` (the owner's own Hugging Face access token, used so ZeroGPU usage draws from their personal free daily quota) are private/server-only `runtimeConfig` values. Free-account ZeroGPU quota is 5 minutes of GPU time/day, so batch-narrating many stories at once needs to be spread across several days. The story detail page's "Listen" toggle only renders when `audio_url` is set, so stories pending generation degrade gracefully.
- **Automated publishing:** `scripts/daily-post.ts` is a standalone Node script (run via `npx tsx`, outside the Nuxt/Nitro context) that picks an unused topic from `shared/utils/topic-pool.ts`, calls the same `generateStoryDraft()`/`publishStoryDraft()` functions `/studio` uses (`shared/utils/story-authoring.ts`, refactored to be framework-agnostic for exactly this reuse), and records the topic in a Supabase `used_topics` table so it's never repeated. Scheduled via a GitHub Actions workflow (`.github/workflows/auto-post.yml`, cron `0 */12 * * *`, i.e. every 12 hours) using repo secrets for `OPENROUTER_API_KEY`/`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` — chosen over hosting-provider cron (e.g. Vercel Cron) because the app isn't deployed anywhere yet, and over a local cron job because it needs to run even when the owner's machine is off.
