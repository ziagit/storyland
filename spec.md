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
| **Content management** | Stories stored in a Supabase Postgres database (public read via anon key, writes via service-role key only), plus an unlisted AI-assisted authoring tool (`/studio`) that publishes new stories straight into the database — see §3.7 |
| **Monetization** | The 5 oldest stories are free forever; every other story (including all future ones) requires a one-time $9.99 Stripe payment to read past the opening paragraph — see §9 |
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
- Kidstory should use a **flat 2D cartoon children's-book illustration style** (bold flat colors, cel shading, vibrant palette, cute rounded characters with big expressive eyes; not 3D/CGI, not photorealistic, not painterly/soft-gradient) — appropriate for the younger audience. Per-story cover images are AI-generated (see §8); the free model used has an inherent bias toward soft painterly shading that prompting can only partially override, so actual results vary in how closely they hit this target.

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
- Read-aloud audio toggle ("Listen"/"Pause") next to Share, using the browser's built-in speech engine (Web Speech API) — no audio files, no server; the button is hidden on browsers without support. Font-size control.
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

### 3.6 Account (`/account`) & Checkout (`/checkout`)
- `/account`: public, nav-linked page (icon in header, next to Search) for reader sign-in and access status.
- Passwordless sign-in: enter an email, receive a Supabase Auth magic link, click it to return signed in — no password to set or manage.
- Once signed in: shows the reader's email, their access status (free tier vs. full access), and — if not yet unlocked — a link to `/checkout`.
- `/checkout`: the site's own custom-branded payment page (not a Stripe-hosted redirect) — see §9 for how the embedded Stripe Payment Element is styled to match the site. Requires sign-in (redirects to `/account?next=/checkout` otherwise). After a successful payment, access unlocks within a few seconds (the Stripe webhook that grants it lands asynchronously).

### 3.7 Studio (`/studio`) — internal authoring tool
- Unlisted page (not linked from nav/footer, no auth) for the site owner to draft new stories with an AI model and publish them.
- Chat-style flow: enter a topic (+ optional category/age hint) → the AI drafts a story → owner can ask for changes in follow-up messages → "Publish" inserts the finished story as a new row in the Supabase `stories` table with a generated slug.
- Server-side only: the OpenRouter API key and the Supabase service-role key both live in `runtimeConfig` (never sent to the client); a Nitro server route calls OpenRouter and another inserts the accepted draft into Supabase.
- Works on read-only/serverless production hosts, since publishing is a database write rather than a filesystem write.
- On successful publish, a copy of the new story is emailed to the site owner — see "New-story email notification" below.

### 3.8 Automated publishing
- A new story is generated and published unattended once a day, every morning (02:00 UTC = 07:00 Asia/Karachi), on top of (not replacing) manual `/studio` use — see §8 for the mechanism.
- Topics are drawn from a curated seed pool (`shared/utils/topic-pool.ts`, ~60 premises spread across the six categories) without repeats, tracked via a Supabase `used_topics` table; once the pool is exhausted the script asks the model to invent a fresh topic distinct from everything used so far.
- Same as `/studio`, a successful automated post also emails the owner a copy of the new story and posts to the Facebook Page, Instagram, and YouTube.

### 3.9 New-story email notification
- Every time a story is published by AI (`/studio` publish or the daily automated job), a copy is emailed to the owner (`zia.flutter@gmail.com`) — title, excerpt, category/age/read-time, the full story text, and a link to the live story page.
- Sent via the owner's own Gmail account over SMTP (`nodemailer`, `shared/utils/notify.ts`'s `sendNewStoryEmail()`, shared between the Nitro `/studio` route and the standalone auto-post script, same pattern as `story-authoring.ts`) — no third-party email service, per the owner's explicit choice. Authenticates with a Gmail [App Password](https://myaccount.google.com/apppasswords) (requires 2-Step Verification enabled), not the real account password, since Google blocks plain-password SMTP.
- Never blocks or fails a publish — a notification failure is logged, not thrown.
- A recomputed cover image (see §8) is embedded at the top of the email — the story detail page also gained an `ogImage` meta tag using the same cover image, for good link-preview cards wherever a story URL is shared (Facebook included — see §3.10).

### 3.10 Facebook auto-post
- Every time a story is published by AI (`/studio` or the automated job), it's also posted to the Kidstory Facebook Page — a short message (title + emoji + excerpt) plus a link back to the live story page. Facebook unfurls the link into a preview card using the story page's Open Graph tags (title, description, cover image).
- Posted via the Facebook Graph API (`shared/utils/facebook.ts`'s `postStoryToFacebook()`, same framework-agnostic pattern as `notify.ts`) using a permanent Page Access Token (`FACEBOOK_PAGE_ID` / `FACEBOOK_PAGE_ACCESS_TOKEN`) — no ongoing OAuth flow or token refresh needed once set up.
- Never blocks or fails a publish — a posting failure is logged, not thrown.

### 3.11 Instagram auto-post
- Every time a story is published by AI (`/studio` or the automated job), it's also posted to the Kidstory Instagram account (`@kidstory64`) as a single-image feed post: the story's cover image with a caption (title + emoji + excerpt + the story URL as plain text + a "link in bio" nudge + a small hashtag set).
- Unlike Facebook, Instagram **requires media on every post** and its caption links are **not tappable** — so the post always uses the recomputed cover image (same formula as the email, see §8) and the URL is text-only. Set the account's bio link to the site for a working path.
- Posted via the Instagram Graph API (`shared/utils/instagram.ts`'s `postStoryToInstagram()`, same framework-agnostic pattern as `facebook.ts`), a two-step create-container → poll-status → publish flow, using a permanent Page Access Token scoped with `instagram_basic` + `instagram_content_publish` (`INSTAGRAM_ACCOUNT_ID` / `INSTAGRAM_ACCESS_TOKEN`). The Instagram account is a Business account linked to the Kidstory Facebook Page; the token is the Page token, not a separate Instagram login.
- Never blocks or fails a publish — a posting failure is logged, not thrown.

### 3.12 YouTube auto-post
- Every time a story is published by AI (`/studio` or the automated job), it's also uploaded to the Kidstory YouTube channel as a **silent ~25s 1080p video** of the story's cover image (letterboxed, no crop), with the story title/emoji as the video title, the excerpt + story link as the description, the story tags as video tags, and `selfDeclaredMadeForKids: true` (COPPA).
- The video is rendered on the fly with the bundled `ffmpeg-static` (`shared/utils/youtube.ts`'s `postStoryToYouTube()`, same framework-agnostic pattern as `facebook.ts`), then uploaded via `youtube.videos.insert` (`googleapis`).
- YouTube needs **Google OAuth 2.0**, not a permanent token: `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REFRESH_TOKEN`. The OAuth consent app must be published to Production (a "Testing" app's refresh token expires after 7 days), and the authorized Google account must already have a YouTube channel. One-time refresh-token capture: `scripts/youtube-auth.mjs`. See `SOCIAL-SETUP.md` Part B2.
- Runs from the GitHub Actions auto-post job and local `/studio`; may be skipped on Vercel because `ffmpeg-static` (~80 MB) can exceed the serverless bundle limit. Quota: 10,000 units/day ÷ 1,600 per upload ≈ 6/day.
- Never blocks or fails a publish — an upload failure is logged, not thrown; temp files are cleaned in a `finally`.

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
  published_at: timestamptz
  is_premium: boolean    // true = requires full-access purchase to read past the opening paragraph; see §9
}
```

The public site reads via Nitro server routes (`server/api/stories/*.get.ts`) using the Supabase anon key, guarded by a read-only Row Level Security policy. Writes (from `/studio`) use the service-role key server-side only, which bypasses RLS. Categories remain a small hardcoded list in `app/data/categories.ts` (tied to Lucide icon components, which don't serialize well to a DB row).

A second table, `public.entitlements`, tracks who has purchased full access:

```ts
{
  user_id: uuid                        // primary key, references auth.users
  stripe_customer_id: string | null
  stripe_checkout_session_id: string | null
  purchased_at: timestamptz
}
```

Written only by the Stripe webhook handler (service-role key), never by the client — see §9.

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
6. ~~**Read-aloud/audio narration**~~ — resolved: in scope for v1, via the browser's built-in Web Speech API (client-side, no audio files or server). An earlier self-hosted Qwen3-TTS-on-Hugging-Face approach was dropped once Hugging Face stopped offering free compute; see §8.
7. **Number of launch stories** — how many stories should be ready at launch, to size the homepage/Stories page properly?
8. ~~**Domain/deployment target**~~ — resolved: the app is deployed on Vercel (discovered mid-session on 2026-08-22, not originally set up by/known to Claude — its env vars are managed separately in the Vercel dashboard, distinct from local `.env` and the GitHub Actions secrets used by the automated-publishing workflow).

---

## 8. Tech Notes

- **Framework:** Nuxt 4, using the new `app/` directory structure, file-based routing (`pages/`), auto-imported components.
- **Styling:** Tailwind CSS with a custom theme (`tailwind.config.ts`) mapping the color tokens in §2.2, custom `fontFamily`, and `borderRadius` scale tuned for the rounded aesthetic.
- **Images:** `@nuxt/image` for optimized, responsive illustration/cover images. Per-story cover images are generated (no signup/key needed) via Pollinations.ai (`server/utils/cover-image.ts`'s `buildCoverImageUrl()`), seeded deterministically from the story's slug so the same story always gets the same cached image; the prompt targets the flat-2D-cartoon style in §2.5, though the underlying free model (`sana`, the only model Pollinations currently exposes) has its own stylistic bias, so results vary.
- **SEO:** Nuxt's built-in `useSeoMeta` per page/story; Open Graph image per story for social sharing.
- **Accessibility:** semantic headings, alt text on all illustrations, keyboard-navigable nav/filters, color contrast checked against the cream/tan backgrounds, `prefers-reduced-motion` respected.
- **Responsiveness:** mobile-first; category strip and story grid collapse to horizontal scroll / single column on small screens.
- **AI story authoring:** `/studio` and `scripts/daily-post.ts` both call the OpenRouter chat completions API (`nvidia/nemotron-3-super-120b-a12b:free`, JSON mode, `max_tokens: 3000` to leave room for the model's mandatory reasoning trace) via the shared `generateStoryDraft()` (`shared/utils/story-authoring.ts`), from Nitro server routes (`server/api/studio/generate.post.ts`, `server/api/studio/publish.post.ts`) for `/studio` and directly for the automation script. `OPENROUTER_API_KEY` is read from `.env` via Nuxt `runtimeConfig` (private, server-only — never exposed to the client) or directly from `process.env` in the standalone script. Publishing inserts a new row into the Supabase `stories` table.
- **Database:** Supabase (Postgres) via `@supabase/supabase-js`. `SUPABASE_URL` + `SUPABASE_ANON_KEY` are public (`runtimeConfig.public`, used for read-only queries from Nitro routes, protected by an RLS read policy); `SUPABASE_SERVICE_ROLE_KEY` is private/server-only (`runtimeConfig`, used for writes from `/studio` and the one-time seed route). Schema lives in `supabase/schema.sql`; run it once in the Supabase SQL Editor to create the `stories` table.
- **Read-aloud narration:** the story detail page's "Listen" toggle uses the browser's built-in **Web Speech API** (`window.speechSynthesis`) — one `SpeechSynthesisUtterance` per body paragraph, queued, read with the visitor's own device voice. Entirely client-side: no audio files, no Supabase Storage, no server route, no API key, no cost. The button is hidden when `speechSynthesis` is unavailable, cancels on unmount / story navigation, and includes a 10s `resume()` keep-alive to work around Chrome's long-utterance cutoff. Voice quality varies by device (best on iOS/macOS). An earlier approach (pre-generated WAVs from a self-hosted Qwen3-TTS Hugging Face Space, cached in Supabase Storage on an `audio_url` column) was removed once Hugging Face ended free compute; the `audio_url` column may still exist unused on the live DB.
- **Automated publishing:** `scripts/daily-post.ts` is a standalone Node script (run via `npx tsx`, outside the Nuxt/Nitro context) that picks an unused topic from `shared/utils/topic-pool.ts`, calls the same `generateStoryDraft()`/`publishStoryDraft()` functions `/studio` uses (`shared/utils/story-authoring.ts`, refactored to be framework-agnostic for exactly this reuse), and records the topic in a Supabase `used_topics` table so it's never repeated. Scheduled via a GitHub Actions workflow (`.github/workflows/auto-post.yml`, cron `0 2 * * *`, i.e. once a day at 02:00 UTC / 07:00 Asia/Karachi) using repo secrets for `OPENROUTER_API_KEY`/`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (plus the `GMAIL_*`/`NOTIFY_EMAILS`/`FACEBOOK_*`/`INSTAGRAM_*`/`YOUTUBE_*` secrets for the share steps) — chosen over hosting-provider cron (e.g. Vercel Cron) because the app isn't deployed anywhere yet, and over a local cron job because it needs to run even when the owner's machine is off.
- **Payments & auth:** Stripe (`stripe` npm package server-side, `@stripe/stripe-js` client-side) for a custom-branded embedded checkout, Supabase Auth (passwordless email magic link) for reader identity — see §9 for the full flow. `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are private/server-only `runtimeConfig` values; `STRIPE_PUBLISHABLE_KEY` is public (needed client-side to load Stripe.js and mount the Payment Element).
- **New-story email notifications:** `nodemailer` npm package, sending via Gmail SMTP with the owner's own account. `GMAIL_USER`/`GMAIL_APP_PASSWORD` are private/server-only `runtimeConfig` values (and plain `process.env` reads in `scripts/daily-post.ts`, same pattern as its other env vars). See §3.9.
- **Facebook auto-post:** plain `fetch()` against the Graph API (no SDK needed for a single POST call). `FACEBOOK_PAGE_ID`/`FACEBOOK_PAGE_ACCESS_TOKEN` are private/server-only `runtimeConfig` values (and plain `process.env` reads in `scripts/daily-post.ts`). The Page Access Token was obtained once via a short-lived User Access Token (Graph API Explorer, `pages_show_list`/`pages_manage_posts`/`pages_read_engagement` scopes) exchanged for a long-lived one, then used to fetch a Page Access Token that itself doesn't expire (`expires_at: 0` per the Graph API's own token-debug endpoint) — no refresh flow needed unless the token is ever revoked. See §3.10.
- **Instagram auto-post:** plain `fetch()` against the Instagram Graph API (`shared/utils/instagram.ts`), a two-step create-container → poll `status_code` → `media_publish` flow. `INSTAGRAM_ACCOUNT_ID` (the IG Business account id) / `INSTAGRAM_ACCESS_TOKEN` are private/server-only `runtimeConfig` values (and plain `process.env` reads in `scripts/daily-post.ts`). The token is a permanent Page Access Token for the Kidstory Facebook Page, obtained the same way as the Facebook one but with `instagram_basic` + `instagram_content_publish` added to the scopes; the IG account is a Business account linked to that Page. `shared/utils/instagram.ts` also calls `dns.setDefaultResultOrder('ipv4first')` for the same IPv6 `ENETUNREACH` reason as `facebook.ts`. See §3.11.
- **YouTube auto-post:** `shared/utils/youtube.ts` renders a silent cover-image MP4 with `ffmpeg-static` + `fluent-ffmpeg`, then uploads via `googleapis`' `youtube.videos.insert`. Auth is Google OAuth 2.0 — `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REFRESH_TOKEN` (private/server-only `runtimeConfig`, plain `process.env` in the script). The one-time refresh token comes from `scripts/youtube-auth.mjs` (local browser consent flow) and only stays valid if the Google OAuth app is published to Production; the authorized account must have a YouTube channel. Video-rendering needs the ffmpeg binary, so this path is expected to work from GitHub Actions + local `/studio` but may be skipped on Vercel. See §3.12 and `SOCIAL-SETUP.md`.

---

## 9. Payments & Access

- **Model:** one-time payment, not a subscription. $9.99 USD unlocks every story — current and future — forever, for that Supabase Auth account. Chosen over per-story purchases or a subscription for simplicity: no recurring billing, no renewal/cancellation webhooks to handle.
- **Free tier:** the 5 oldest stories (by `published_at`) are free to read in full, with no sign-in required. This set is fixed by a one-time database backfill (not recomputed on every request), so it never shifts as new stories get published — a story that was free stays free. Every other story, including all future `/studio` and auto-posted stories, defaults to paywalled (`is_premium = true`).
- **Reading a paywalled story:** the opening paragraph is always visible (acts as the excerpt/hook); the rest is replaced by a paywall prompt ("Unlock the rest of this story") with a button that either prompts sign-in (if signed out) or starts a Stripe Checkout session (if signed in but not yet entitled). The full body is withheld server-side, not just hidden in the UI, so it isn't exposed to an unpaying reader via the network response either — see `server/api/stories/[slug].get.ts`.
- **Identity:** Supabase Auth, email magic link only (no passwords). A reader signs in once at `/account`; their Supabase session (a JWT) is sent as a bearer token on requests that need to check entitlement.
- **Purchase flow:** a dedicated, custom-branded `/checkout` page (not a Stripe-hosted redirect) — matches the rest of the site's rounded/warm design, header/footer included. It calls `POST /api/checkout/create-intent` (requires a signed-in user) to create a Stripe PaymentIntent for $9.99, then mounts Stripe's embedded Payment Element (loaded client-side via `@stripe/stripe-js`) into the page using Stripe's `appearance` API themed with the site's actual color tokens (§2.2) and body font, so the card-entry UI blends into the page rather than looking like a generic Stripe widget. Stripe's own iframe still handles the raw card input for PCI compliance — only the surrounding page chrome, colors, and copy are custom. On submit, `stripe.confirmPayment()` completes the charge without leaving the page (`redirect: 'if_required'`); a 3D Secure challenge, if a card requires one, is the one part of the flow Stripe itself controls.
- **Granting access:** a Stripe webhook (`POST /api/stripe/webhook`, verified against `STRIPE_WEBHOOK_SECRET`) listens for `payment_intent.succeeded` and upserts a row into `public.entitlements` for that user — this is the only thing that ever writes to that table. Access is checked by looking up that table, not by trusting anything client-side.
- **Not in scope for v1:** refunds/chargebacks handling beyond Stripe's own dashboard, a customer-facing receipt/invoice history page, gifting or multi-device account recovery beyond Supabase's own magic-link re-send.
