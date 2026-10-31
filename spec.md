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
| **Content management** | Stories stored in a Supabase Postgres database, accessed by the site **only through the `kidstory-api` companion service** (§10) — the Nuxt app itself never queries the `stories` table directly. Plus an unlisted AI-assisted authoring tool (`/studio`) that publishes new stories through the API — see §3.7 |
| **Monetization** | None. Every story is free to read in full (the 2026-08 paywall in §9 was removed on 2026-10-31) |
| **Companion API** | `kidstory-api` — a standalone FastAPI service in a sibling folder (`../kidstory-api`, own git repo) exposing the story catalog over REST; the site's only path to story data — see §10 |
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

### 3.6 Account (`/account`)
- `/account`: public page for reader sign-in (no longer linked from the header since 2026-10-31).
- Magic-link sign-in: enter an email, receive a Supabase Auth magic link, click it to return signed in.
- Once signed in, a "Set Password" form sets the password used on `/login` (§3.7). A "Forgot password?" email from `/login` also lands here.
- Once signed in: shows the reader's email, a note that every story is free, and a sign-out button. (`/checkout` was removed with the paywall on 2026-10-31.)

### 3.7 Admin panel (`/admin`) and Studio (`/admin/studio`) — internal tools
- Owner-only admin panel with its own layout (sidebar on desktop, tab bar on mobile; no public header/footer). The footer's "Studio →" button links to `/admin`. Sections:
  - **Dashboard** (`/admin`): only the **agent machine**, an animated diagram of kidstory-api's five Claude agents (Story, Social, Books, Support, Visitors). It shows what starts each one (Studio chat, the two daily crons, partner apps, site visitors, the visit tracker, the owner on the Visitors page), the hand-offs between them (Story and Books → Social), the tools each uses, and where the work lands (the Supabase database, which holds both stories and Book Picks digests and feeds the website; Facebook; Instagram; YouTube for Studio publishes; the owner's inbox for new-story emails and support hand-offs). Live figures on the cards: story count and last story date, digest count and last digest date, total visitors and average visit length. The visit tracker's wire flows, and shows how many, whenever someone is on the site. **It only moves when an agent really runs** (since 2026-10-31): kidstory-api records every agent run and story publish in Supabase `agent_runs` (migration 005), with what started it (`source`: studio, cron, partner, mcp) and where its work went (social `platforms`, books `published`, support `handoff`). The dashboard polls `GET /api/admin/agent-activity` (→ `GET /agents/activity`) every 2 s. A live agent's gear turns, its light pulses and dots flow only along the wires that run is using, from the run's start until 10 s after it ends. The timing uses the server's clock. When nothing runs, the machine is still and shows the last activity. Hovering or clicking an agent highlights its wiring and explains what it does. Light theme, matching the site.
  - **Stories** (`/admin/stories`): the whole catalog with search and a category filter; view, edit (`/admin/stories/[slug]`: title, emoji, excerpt, body, category, age range, read time, tags, cover URL) and delete (with a confirmation dialog).
  - **Studio** (`/admin/studio`, old `/studio` redirects): the AI authoring chat described below.
  - **Book Picks** (`/admin/books`): read-only list of the books agent's digests.
  - **Visitors** (`/admin/visitors`): how many people visit and how long they stay, for the last 7, 30 or 90 days: total visitors (all time), visitors in the period (new and returning), average and median time on the site per visit, pages per visit and the share who left within 10 s, who's on the site now, visitors per day (bar chart, with a table view), the most visited pages with the average time on each, and where visitors came from, their devices and countries. An "Ask the visitors agent" box runs the visitors agent (§3.13) for a short report or an answer to the owner's question. See §3.14 for how visits are counted.
- **Sign-in required:** every `/admin` page (rendered client-side only) sends anyone without a session to `/login`, an email + password form (Supabase Auth `signInWithPassword`) with a "Forgot password?" reset email. Only emails on the `STUDIO_EMAILS` allowlist (server env, comma-separated) get in; an empty list locks the studio for everyone. The server enforces the same check (`requireStudioUser`, `Authorization: Bearer <Supabase access token>`) on `/api/studio/*` and `/api/admin/*` (including the panel's `/api/admin/stories` list/get/patch/delete routes), so the routes can't be called directly either. No sign-up form: the owner's account is the existing Supabase user, with a password set from `/account`.
- Chat-style flow: enter a topic (+ optional category/age hint) → the story agent (§3.13) drafts a story → owner can ask for changes in follow-up messages, which the agent applies to the current draft → "Publish" sends the finished story to `kidstory-api` (`POST /stories`), which derives the slug and stores it. The agent's one-line note (why it wrote this story, or what it changed) is its chat reply.
- Server-side only: the `kidstory-api` key lives in `runtimeConfig` (never sent to the client); one Nitro server route asks the API's story agent to write or revise the story (`POST /agents/story`, with the current draft and chat history on follow-ups) and another asks it to store the accepted draft (`POST /stories`).
- Works on read-only/serverless production hosts, since publishing is a database write rather than a filesystem write.
- On successful publish, a copy of the new story is emailed to the site owner — see "New-story email notification" below.

### 3.8 Automated publishing
- A new story is generated and published unattended once a day, every morning (Vercel Cron, `0 2 * * *` = ~07:00 Asia/Karachi — the Hobby plan fires it sometime within the 02:00 UTC hour), on top of (not replacing) manual `/studio` use — see §8 for the mechanism.
- The story is written by the **story agent** (§3.13). Premises are drawn from a curated seed pool (`shared/utils/topic-pool.ts`, ~60 premises spread across the six categories) without repeats, tracked via a Supabase `used_topics` table, and handed to the agent as the premise to build on. Once the pool is exhausted the agent chooses its own premise from what the catalog is missing.
- Same as `/studio`, a successful automated post is handed to the **social agent** (§3.13), which shares it on Facebook and Instagram and emails the owner a copy. YouTube only happens where kidstory-api has ffmpeg (§3.12), which the deployed API on Vercel doesn't.

### 3.9 New-story email notification
- Every time a story is published by AI (`/studio` publish or the daily automated job), a copy is emailed to the owner (`zia.flutter@gmail.com`) — title, excerpt, category/age/read-time, the full story text, and a link to the live story page.
- **Sent by the social agent** (since 2026-10-31, at the owner's request) through its `email_owner` tool on kidstory-api (`app/notify.py`, Python `smtplib` over Gmail SMTP, IPv4-only). The agent writes the subject and a short note; the server adds the cover, the full story and the link. Recipients: the API's `NOTIFY_EMAILS` (defaults to the owner). Still the owner's own Gmail account — no third-party email service, per the owner's explicit choice. The Nuxt app still sends the support chat's hand-off emails itself (`shared/utils/notify.ts`). Authenticates with a Gmail [App Password](https://myaccount.google.com/apppasswords) (requires 2-Step Verification enabled), not the real account password, since Google blocks plain-password SMTP.
- Never blocks or fails a publish — a notification failure is logged, not thrown.
- A recomputed cover image (see §8) is embedded at the top of the email — the story detail page also gained an `ogImage` meta tag using the same cover image, for good link-preview cards wherever a story URL is shared (Facebook included — see §3.10).

### 3.10 Facebook auto-post
- Every time a story is published by AI (`/studio` or the automated job), it's also posted to the Kidstory Facebook Page: a short message written for parents by the social agent (§3.13), plus a link back to the live story page. Facebook unfurls the link into a preview card using the story page's Open Graph tags (title, description, cover image).
- Posted via the Facebook Graph API from kidstory-api (`app/social.py`, called by the social agent's `post_to_facebook` tool), using a permanent Page Access Token (`FACEBOOK_PAGE_ID` / `FACEBOOK_PAGE_ACCESS_TOKEN`, set on the API). No ongoing OAuth flow or token refresh is needed once set up.
- Never blocks or fails a publish — a posting failure is logged, not thrown.

### 3.11 Instagram auto-post
- Every time a story is published by AI (`/studio` or the automated job), it's also posted to the Kidstory Instagram account (`@kidstory64`) as a single-image feed post: the story's cover image with a caption written by the social agent (§3.13). The caption has a hook, a line about the story, the story URL as plain text with a "link in bio" nudge, and a few relevant hashtags.
- Unlike Facebook, Instagram **requires media on every post** and its caption links are **not tappable** — so the post always uses the recomputed cover image (same formula as the email, see §8) and the URL is text-only. Set the account's bio link to the site for a working path.
- Posted via the Instagram Graph API from kidstory-api (`app/social.py`, called by the social agent's `post_to_instagram` tool), a two-step create-container → poll-status → publish flow, using a permanent Page Access Token scoped with `instagram_basic` + `instagram_content_publish` (`INSTAGRAM_ACCOUNT_ID` / `INSTAGRAM_ACCESS_TOKEN`). The Instagram account is a Business account linked to the Kidstory Facebook Page; the token is the Page token, not a separate Instagram login.
- Never blocks or fails a publish — a posting failure is logged, not thrown.

### 3.12 YouTube auto-post
- Every time a story is published by AI (`/studio` or the automated job), the social agent (§3.13) also uploads it to the Kidstory YouTube channel as a **silent ~25s 1080p video** of the story's cover image (letterboxed, no crop), with a title and description written by the social agent (the description must contain the story link), the story tags as video tags, and `selfDeclaredMadeForKids: true` (COPPA).
- Done by the social agent's `post_to_youtube` tool on kidstory-api (`app/youtube.py`): the video is rendered with the host's `ffmpeg` binary (`FFMPEG_PATH` or `PATH`), then uploaded with a resumable `videos.insert` over plain HTTP (no Google SDK). The YouTube credentials live on the API now.
- YouTube needs **Google OAuth 2.0**, not a permanent token: `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REFRESH_TOKEN`. The OAuth consent app must be published to Production (a "Testing" app's refresh token expires after 7 days), and the authorized Google account must already have a YouTube channel. One-time refresh-token capture: `scripts/youtube-auth.mjs`. See `SOCIAL-SETUP.md` Part B2.
- Only runs where kidstory-api has ffmpeg, i.e. when the API runs on the owner's machine. On Vercel the agent isn't given the YouTube tool and the result says `skipped` ("no ffmpeg"). Quota: 10,000 units/day ÷ 1,600 per upload ≈ 6/day.
- Never blocks or fails a publish — an upload failure is logged, not thrown; temp files are cleaned in a `finally`.

---

### 3.13 AI agents
Five Claude agents run on kidstory-api (§10), built on the Anthropic SDK's tool runner. Each one decides its own steps: it calls tools, reads what they return, and keeps going until the job is done.
- **Story agent** (`POST /agents/story`) writes every story: the `/studio` chat (§3.7), the daily automated story (§3.8) and the API's MCP `generate_story` tool all use it. It looks at the catalog (story counts per category and age range, newest titles), picks a category and age range the catalog is short on unless they're given, searches the catalog so the premise isn't a near-copy, then writes every field of the story and submits it. The submission is checked against the catalog's rules: 2–4 paragraphs, 150–450 words, a valid category and age range, a title that isn't taken, 1–4 tags, and a short excerpt. Problems go back to the agent to fix. Given a draft and a change request (a `/studio` follow-up), it revises that draft instead of starting over, with the earlier chat turns as context.
- **Social agent** (`POST /agents/social`) shares a published story on Facebook and Instagram (§3.10, §3.11), emails the owner a copy (§3.9) and uploads a cover video to YouTube (§3.12); a Book Picks digest goes to Facebook and Instagram only. It reads the story and checks each account's last few posts so the new one doesn't repeat them. It then writes a post that suits each platform (Facebook: a short message for parents; Instagram: a caption with the URL as text and hashtags) and publishes it. The server fixes the link and the image, so the agent controls only the words. The post tools enforce each platform's limits and require the story URL in the Instagram caption. Each platform gets at most one post per run and two attempts. A `dryRun` mode writes the posts without publishing them. The posts never address children directly or ask them to do anything online.
- **Support agent** (`POST /agents/support`) is the site's chat bubble (`SupportChat.vue`, on every page). It answers readers' questions about sign-in, the free stories and Full Access, and recommends real stories from the catalog. It can only read: for refunds, payments that didn't unlock, bugs, or a reader who wants a person, it hands the chat off and the Nuxt route (`/api/support/chat`) emails the owner the summary and transcript, with the reader's email as Reply-To. It asks for an email first if the reader isn't signed in. The route is public, so it caps message length and how many messages one visitor can send; the API key stays on the server. It never asks for card numbers or passwords, and stays on Kidstory topics.
- **Books agent** (`POST /agents/books`) writes the daily **Book Picks** digest (`/books`, `/books/[slug]`, linked in the header and footer): which children's books are selling best right now and who each suits. It searches the web for current bestseller lists (Anthropic's server-side web search), takes an angle the recent digests didn't, and writes 3–5 paragraphs in its own words naming 3–8 books with their authors and ages, plus the pages the rankings came from. It may only cite pages its own searches returned, never invents rankings or quotes, and leaves out books that aren't for children. Digests are free to read, stored in Supabase `book_digests`. A second Vercel Cron job (`/api/cron/books-digest`, `0 14 * * *`) runs it daily and then has the social agent share the digest on Facebook and Instagram (`kind: "books"`). The page says the digest is AI-researched from public bestseller lists.
- **Visitors agent** (`POST /agents/visitors`) reports on the site's visitors (§3.14) to the owner, only when asked on `/admin/visitors`. It reads the visit numbers through read-only tools (`visitor_stats`, `compare_periods`, `story_titles`) and writes a short report: visitors and time on the site, the stories that hold readers, where visitors come from, what changed since the period before, and one or two suggestions. Given a question, it answers that instead. Every number must come from a tool; with few visits it says the numbers are too small to read much into.
- **Partner apps.** Other people's apps and agents can create stories with keys of their own (`POST /partner/stories`, or the separate `/partner/mcp` server), managed by the owner with kidstory-api's `python -m app.partner_cli`. A partner sends a topic only; the story agent writes every word, treats the topic as a suggestion rather than instructions, may decline it if it isn't right for children, and the story is published as soon as it passes the agent's checks, tagged with the app's name (`stories.created_by`). Each key has a daily limit and can be revoked. Partner stories skip the Nuxt publish pipeline (no email, social or YouTube posts). The integration guide for partners is kidstory-api's `PARTNERS.md`.
- YouTube (§3.12) isn't part of the social agent, because its upload renders a video with ffmpeg in the Nuxt app. Its title and description stay template-based.
- Like the rest of the publish pipeline, an agent failure never blocks a publish that already happened: a social agent failure is logged, and a story agent failure means no story that day (the cron returns an error).

### 3.14 Visitor tracking
- Added 2026-10-31 at the owner's request: the total number of visitors and how long they stay are what matter.
- A client-only plugin (`app/plugins/visit-tracker.client.ts`) runs on every public page. A **visitor** is a browser: a random id kept in localStorage, nothing that identifies a person (no IP address stored, no account, no third-party analytics). A **visit** ends after 30 minutes without activity and is shared by the browser's tabs; a browser's first visit counts as new, later ones as returning.
- **Time on the site** counts only while the tab is visible and the reader has scrolled, tapped, typed or moved the mouse in the last 10 minutes, so a forgotten tab doesn't count. The tracker also keeps the time spent on each page.
- The tracker sends the whole visit to the public `POST /api/visits` every 30 s while it grows, on each page change and when the tab is hidden or closed (`sendBeacon`). The route checks every field, caps the time at the visit's length, skips bots, rate-limits per IP, and upserts one row per visit in Supabase `site_visits` (migration 006) with the service-role key. The country comes from Vercel's `x-vercel-ip-country` header; the device type from the user agent; the referrer is kept as a host name only.
- The owner's own browser is left out: from its first visit to `/admin` or `/login`, that browser is never tracked again.
- kidstory-api sums the visits up (`GET /visitors/stats`, the `site_visit_totals` view for all-time totals) for `/admin/visitors`, the agent machine and the visitors agent (§3.13). Days are counted in Pakistan time.

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
- **AI story authoring:** `/studio`, the Vercel cron route and `scripts/daily-post.ts` all write stories through `kidstory-api`'s story agent (`POST /agents/story`, §3.13) via the shared `createStoryWithAgent()` (`shared/utils/story-authoring.ts`). The agent runs on **Claude** (`claude-opus-5-5`, via the official `anthropic` Python SDK and the API's `ANTHROPIC_API_KEY`) — see `../kidstory-api/README.md`. It writes every field of the story itself, and its `submit_story` tool checks them against the catalog's rules. No LLM key is needed in this app (OpenRouter, Groq and the owner's earlier Qwen/TinyLlama fine-tunes are all gone). The Nuxt side only needs `KIDSTORY_API_URL`/`KIDSTORY_API_KEY`. Publishing is `POST /stories` on the same API.
- **Database:** Supabase (Postgres) via `@supabase/supabase-js`. `SUPABASE_URL` + `SUPABASE_ANON_KEY` are public (`runtimeConfig.public`, used for read-only queries from Nitro routes, protected by an RLS read policy); `SUPABASE_SERVICE_ROLE_KEY` is private/server-only (`runtimeConfig`, used for writes from `/studio` and the one-time seed route). Schema lives in `supabase/schema.sql`; run it once in the Supabase SQL Editor to create the `stories` table.
- **Read-aloud narration:** the story detail page's "Listen" toggle uses the browser's built-in **Web Speech API** (`window.speechSynthesis`) — one `SpeechSynthesisUtterance` per body paragraph, queued, read with the visitor's own device voice. Entirely client-side: no audio files, no Supabase Storage, no server route, no API key, no cost. The button is hidden when `speechSynthesis` is unavailable, cancels on unmount / story navigation, and includes a 10s `resume()` keep-alive to work around Chrome's long-utterance cutoff. Voice quality varies by device (best on iOS/macOS). An earlier approach (pre-generated WAVs from a self-hosted Qwen3-TTS Hugging Face Space, cached in Supabase Storage on an `audio_url` column) was removed once Hugging Face ended free compute; the `audio_url` column may still exist unused on the live DB.
- **Automated publishing:** primary scheduling is **Vercel Cron** — `vercel.json`'s `crons` entry hits `server/api/cron/daily-post.get.ts` on the deployment once a day (`0 2 * * *`). That route picks an unused topic (`shared/utils/auto-post.ts`'s `pickAutoPostTopic()`, backed by the Supabase `used_topics` table), generates and publishes via the same `createStoryWithAgent()`/`publishStoryDraft()` `/studio` uses (`shared/utils/story-authoring.ts`), records the topic right after publish (so a timeout can't cause a repeat), then emails the owner and posts to Facebook + Instagram. It's guarded by a `CRON_SECRET` bearer check (Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`). Needs `CRON_SECRET` plus the `OPENROUTER_API_KEY`/`SUPABASE_*`/`GMAIL_*`/`NOTIFY_EMAILS`/`SITE_URL`/`FACEBOOK_*`/`INSTAGRAM_*` values as Vercel env vars. `nuxt.config.ts` sets `nitro.vercel.functions.maxDuration = 60` (the Hobby-plan ceiling) since the LLM call plus posts exceed the default 10s. `scripts/daily-post.ts` is the same pipeline as a standalone script (`npx tsx` / `npm run auto-post`), kept as a manual fallback — it additionally posts to YouTube, and is what the now manual-only `.github/workflows/auto-post.yml` (`workflow_dispatch` only) runs. GitHub Actions was the original scheduler, chosen when the app had no deployment; Vercel Cron replaced it once the app was live on Vercel (see decision log).
- **Payments & auth:** Stripe (`stripe` npm package server-side, `@stripe/stripe-js` client-side) for a custom-branded embedded checkout, Supabase Auth (passwordless email magic link) for reader identity — see §9 for the full flow. `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are private/server-only `runtimeConfig` values; `STRIPE_PUBLISHABLE_KEY` is public (needed client-side to load Stripe.js and mount the Payment Element).
- **New-story email notifications:** sent by kidstory-api's social agent (`app/notify.py`, Gmail SMTP with the owner's own account; `GMAIL_USER`/`GMAIL_APP_PASSWORD`/`NOTIFY_EMAILS` on the API). The Nuxt app keeps its own `GMAIL_*` values and `nodemailer` only for support hand-off emails. See §3.9.
- **Facebook auto-post:** plain `fetch()` against the Graph API (no SDK needed for a single POST call). `FACEBOOK_PAGE_ID`/`FACEBOOK_PAGE_ACCESS_TOKEN` are private/server-only `runtimeConfig` values (and plain `process.env` reads in `scripts/daily-post.ts`). The Page Access Token was obtained once via a short-lived User Access Token (Graph API Explorer, `pages_show_list`/`pages_manage_posts`/`pages_read_engagement` scopes) exchanged for a long-lived one, then used to fetch a Page Access Token that itself doesn't expire (`expires_at: 0` per the Graph API's own token-debug endpoint) — no refresh flow needed unless the token is ever revoked. See §3.10.
- **Instagram auto-post:** plain `fetch()` against the Instagram Graph API (`shared/utils/instagram.ts`), a two-step create-container → poll `status_code` → `media_publish` flow. `INSTAGRAM_ACCOUNT_ID` (the IG Business account id) / `INSTAGRAM_ACCESS_TOKEN` are private/server-only `runtimeConfig` values (and plain `process.env` reads in `scripts/daily-post.ts`). The token is a permanent Page Access Token for the Kidstory Facebook Page, obtained the same way as the Facebook one but with `instagram_basic` + `instagram_content_publish` added to the scopes; the IG account is a Business account linked to that Page. `shared/utils/instagram.ts` also calls `dns.setDefaultResultOrder('ipv4first')` for the same IPv6 `ENETUNREACH` reason as `facebook.ts`. See §3.11.
- **YouTube auto-post:** kidstory-api's `app/youtube.py` renders a silent cover-image MP4 with the host's ffmpeg, then uploads with a resumable `videos.insert` over `httpx`. Auth is Google OAuth 2.0 — `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REFRESH_TOKEN`, set on the API. The one-time refresh token comes from `scripts/youtube-auth.mjs` (local browser consent flow) and only stays valid if the Google OAuth app is published to Production; the authorized account must have a YouTube channel. Video rendering needs the ffmpeg binary, so it runs only where the API has one (locally, not on Vercel). See §3.12 and `SOCIAL-SETUP.md`.

---

## 9. Payments & Access

> **Removed 2026-10-31.** The paywall below is no longer in the app: every story is free to read in full, and `/checkout`, the Stripe routes and the entitlement checks were deleted. Kept as history; `stories.is_premium` and `entitlements` still exist in the database but nothing reads them.

- **Model:** one-time payment, not a subscription. $9.99 USD unlocks every story — current and future — forever, for that Supabase Auth account. Chosen over per-story purchases or a subscription for simplicity: no recurring billing, no renewal/cancellation webhooks to handle.
- **Free tier:** the 5 oldest stories (by `published_at`) are free to read in full, with no sign-in required. This set is fixed by a one-time database backfill (not recomputed on every request), so it never shifts as new stories get published — a story that was free stays free. Every other story, including all future `/studio` and auto-posted stories, defaults to paywalled (`is_premium = true`).
- **Reading a paywalled story:** the opening paragraph is always visible (acts as the excerpt/hook); the rest is replaced by a paywall prompt ("Unlock the rest of this story") with a button that either prompts sign-in (if signed out) or starts a Stripe Checkout session (if signed in but not yet entitled). The full body is withheld server-side, not just hidden in the UI, so it isn't exposed to an unpaying reader via the network response either — see `server/api/stories/[slug].get.ts`.
- **Identity:** Supabase Auth, email magic link only (no passwords). A reader signs in once at `/account`; their Supabase session (a JWT) is sent as a bearer token on requests that need to check entitlement.
- **Purchase flow:** a dedicated, custom-branded `/checkout` page (not a Stripe-hosted redirect) — matches the rest of the site's rounded/warm design, header/footer included. It calls `POST /api/checkout/create-intent` (requires a signed-in user) to create a Stripe PaymentIntent for $9.99, then mounts Stripe's embedded Payment Element (loaded client-side via `@stripe/stripe-js`) into the page using Stripe's `appearance` API themed with the site's actual color tokens (§2.2) and body font, so the card-entry UI blends into the page rather than looking like a generic Stripe widget. Stripe's own iframe still handles the raw card input for PCI compliance — only the surrounding page chrome, colors, and copy are custom. On submit, `stripe.confirmPayment()` completes the charge without leaving the page (`redirect: 'if_required'`); a 3D Secure challenge, if a card requires one, is the one part of the flow Stripe itself controls.
- **Granting access:** a Stripe webhook (`POST /api/stripe/webhook`, verified against `STRIPE_WEBHOOK_SECRET`) listens for `payment_intent.succeeded` and upserts a row into `public.entitlements` for that user — this is the only thing that ever writes to that table. Access is checked by looking up that table, not by trusting anything client-side.
- **Not in scope for v1:** refunds/chargebacks handling beyond Stripe's own dashboard, a customer-facing receipt/invoice history page, gifting or multi-device account recovery beyond Supabase's own magic-link re-send.

---

## 10. Companion API (`kidstory-api`)

A separate FastAPI (Python) service living alongside this app at `../kidstory-api`, in its
own git repository. It is **not** part of the Nuxt deployment, but the site **depends on it**:
every story read and write in the Nuxt app goes through this API rather than straight to
Supabase. The site's own Nitro routes (`server/api/stories/*`, `/studio` publish, the daily
cron, the admin seed/backfill routes) are thin proxies that call the API, forwarding the
reader's Supabase token on reads and attaching the API key on writes. The API is reachable
from the Nuxt server via `KIDSTORY_API_URL` (default `http://localhost:8000`) and
`KIDSTORY_API_KEY`.

- **What stays on Supabase directly.** The API only covers stories and categories. The Nuxt
  app still talks to Supabase itself for what the API has no route for: Supabase Auth
  (magic-link sign-in in the browser, token verification on the server), the `entitlements`
  table (Stripe webhook writes, access checks), and the `used_topics` table (daily auto-post
  dedupe).
- **Shared database, not a copy.** It talks to the same Supabase project and the same
  `public.stories` / `public.entitlements` tables, with the same credential split the Nuxt app
  uses: the anon key for reads (RLS-guarded) and the service-role key for writes and
  entitlement lookups. A story published from `/studio` is immediately visible through the
  API, and a story created through the API appears on the site.
- **Endpoints.** `GET /health`, `GET /categories`, `GET /stories` (filters: `category`,
  `ageRange`, `tag`, `q` search, `limit`/`offset`), `GET /stories/{slug}`, plus
  `POST /stories`, `PATCH /stories/{slug}` and `DELETE /stories/{slug}`, plus
  the five agents, `POST /agents/story` (writes and revises every story),
  `POST /agents/books`, `POST /agents/social`, `POST /agents/support` and `POST /agents/visitors`,
  plus `GET /visitors/stats` for the admin's Visitors page, plus
  `GET /books` and `GET /books/{slug}` for Book Picks digests, plus `POST /partner/stories` and `/partner/mcp` for partner
  apps (§3.13). Responses are
  camelCase (the `Story` shape the Nuxt pages consume).
- **Auth.** Reads are public, like the site. Writes require an `X-API-Key` header matching
  `KIDSTORY_API_KEY` (a secret belonging to the API, unrelated to Supabase Auth). Reading a
  single story accepts an optional `Authorization: Bearer <Supabase access token>` so an
  entitled reader can unlock premium stories.
- **Paywall parity.** §9's rule is enforced server-side here too: a premium story returns only
  its opening paragraph plus `locked: true` and `lockedBodyCount` unless the caller's Supabase
  token maps to a row in `entitlements`. The listing endpoint never returns body text at all.
- **Derived fields on create.** Slug (same `slugify()` rule, `-2`/`-3`… on collision), cover
  image URL (a Python port of the Pollinations formula in §8), and `published_at` are derived
  when omitted; new stories default to `is_premium = true`, per §9.
- **AI lives here.** Every Claude call runs on the API: `/studio` drafting, the story agent and
  the social agent, which also holds the Facebook/Instagram tokens and posts to them. The Nuxt
  app never talks to a model provider.
- **Not in scope.** The owner email (§3.9), the YouTube upload (§3.12), topic bookkeeping
  (`used_topics`) and the orchestration of the daily run stay in the Nuxt publish pipeline and
  the daily cron.
- **Stack.** Python 3.12, FastAPI, `supabase-py`, pydantic-settings, uvicorn; pytest suite runs
  against an in-memory Supabase fake (no credentials, no network).
