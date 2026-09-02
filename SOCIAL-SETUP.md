# Social auto-posting setup (Facebook + Instagram + YouTube)

How the Kidstory social auto-posting was set up, and how to redo it if a credential is
ever revoked.

Every AI-published story (`/studio` or `scripts/daily-post.ts`) posts to:
- the **Facebook Page** — message + link, unfurled into a preview card (`shared/utils/facebook.ts`)
- the **Instagram account** (`@kidstory64`) — cover image + caption, single-image feed post (`shared/utils/instagram.ts`)
- the **YouTube channel** — a silent ~25s 1080p video of the cover image (`shared/utils/youtube.ts`)

Facebook + Instagram use **one permanent Facebook Page access token** with Instagram
scopes added (Instagram publishing goes through the Facebook Graph API because the IG
account is a Business/Creator account linked to the Page). **YouTube is separate** — it
uses Google OAuth 2.0 with a refresh token (see Part B2).

---

## Known values for this project

| Thing | Value |
|---|---|
| Meta app name | Kidstory Publisher |
| Meta app ID | `1363769955432126` |
| Facebook Page name | Kidstory |
| Facebook Page ID | `1354300511092158` |
| Instagram username | `@kidstory64` |
| Instagram Business account ID | `17841436819683930` |
| Graph API version used in code | `v21.0` |

Secrets (app secret, tokens) live in `.env` — never commit them.

---

## Part A — Facebook: Page + App

### A1. Have a Facebook Page
The Kidstory Page already exists (ID `1354300511092158`). If recreating: facebook.com →
Pages → Create new Page. You must be an **admin** / have **Full control** of the Page
(check at business.facebook.com → Settings → Pages → *People*).

### A2. Create a Meta Developer App
1. Go to <https://developers.facebook.com/apps/> → **Create App**.
2. App type: **Business**.
3. Name it (e.g. "Kidstory Publisher"), pick your Business Portfolio if asked.
4. After creation, note the **App ID** and, under **App settings → Basic**, the
   **App Secret** (click *Show*). Put the secret in `.env` only if you need it for a
   token exchange — it is not read by the app at runtime.

### A3. Add products
On the app dashboard, add:
- **Facebook Login for Business** (used by Graph API Explorer's token flow)
- **Instagram** → *Instagram API* (a.k.a. "Instagram Graph API" / content publishing)

### A4. App stays in Development mode
Leave the app in **Development** mode. In this mode the Graph API works for anyone with a
**role on the app** (admin / developer / tester) — which is you. `instagram_content_publish`
and `pages_manage_posts` only need App Review ("Advanced Access") if *other* people's
accounts will use it. For a single-owner auto-poster, Development mode is enough forever.

---

## Part B — Instagram: account + switch to Professional + link

### B1. Create the Instagram account
In the Instagram app, sign up normally (`@kidstory64`).

### B2. Switch to a Professional account
Instagram app → **Settings and activity** → scroll to **For professionals** →
**Switch to professional account**.
- Choose **Business** (recommended) or **Creator**. Content publishing via the API works
  with both, but **Business** is the safest / most fully supported.
- Pick a category (e.g. "Publisher" / "Education").
- When prompted, **connect it to the Kidstory Facebook Page** (you can also skip here and
  do it in B3).

### B3. Link the Instagram account to the Facebook Page
This is the critical link — without it the Graph API cannot see the IG account.
- **Meta Business Suite** (business.facebook.com) → **Settings** → **Accounts** →
  **Instagram accounts** → **Add** → log in as `@kidstory64` → attach it to the
  **Kidstory** Page.
- Or on the Page: **Page settings → Linked accounts → Instagram → Connect account**.

Verify: in Meta Business Suite the Kidstory Page should now show the Instagram account
under its linked accounts.

---

## Part B2 — YouTube: channel + Google OAuth

YouTube is different from Facebook/Instagram — it needs **Google OAuth 2.0** with a
**refresh token**, not a permanent access token. Each new story is uploaded as a silent
~25s 1080p video of the story's cover image (`shared/utils/youtube.ts`, rendered with the
bundled `ffmpeg-static`), with the story title/excerpt/link as the video metadata and
`selfDeclaredMadeForKids: true`.

### Y1. Have a YouTube channel — on the account you'll authorize
The Google account you sign in with during Y5 **must already have a YouTube channel**, or
the upload fails with `youtubeSignupRequired`. Create one at youtube.com (avatar → *Create
a channel*). If that account has *multiple* channels, the OAuth flow shows a "choose a
channel" step — pick the right one, or uploads may land on the wrong channel. Simplest: a
Google account with exactly one channel.

### Y2. Google Cloud project + API
- <https://console.cloud.google.com> → create a project ("Kidstory Publisher").
- **APIs & Services → Library** → enable **YouTube Data API v3**.

### Y3. OAuth consent screen
- **APIs & Services → OAuth consent screen** → User type **External**.
- Add scope `https://www.googleapis.com/auth/youtube.upload`.
- Add your Google account under **Test users**.
- **Publish app** → "In production" (accept the "unverified app" warning). *Required* —
  in "Testing" mode the refresh token stops working after 7 days.

### Y4. OAuth client
- **APIs & Services → Credentials → Create credentials → OAuth client ID** →
  application type **Desktop app** (the flow is a one-time CLI token grab, not per-user
  sign-in — a Web client would just mean hand-registering the redirect URI).
- Note the **Client ID** and **Client secret**.

### Y5. Get the refresh token
Run the one-time helper (opens a browser, catches the redirect on `localhost:4576`):
```
node scripts/youtube-auth.mjs <CLIENT_ID> <CLIENT_SECRET>
```
Sign in with the account whose channel should receive uploads, approve access; it prints
`YOUTUBE_REFRESH_TOKEN`. If it prints "(none returned)", revoke the app at
<https://myaccount.google.com/permissions> and run it again.

### Y6. Quota note
YouTube Data API default quota is 10,000 units/day; each upload costs 1,600 → ~6 uploads
per day. Fine for 2 auto-posts + occasional manual `/studio` use. Request more in the
Cloud Console if needed.

---

## Part C — Get the permanent token + the IG account ID

Uses **Graph API Explorer**: <https://developers.facebook.com/tools/explorer/>

### C1. Select the app and add permissions
1. **Meta App** dropdown → **Kidstory Publisher**.
2. **User or Page** → **User Token**.
3. In **Permissions**, add all of:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic`
   - `instagram_content_publish`

### C2. Generate the token and grant the Page + IG account
1. Click **Generate Access Token**.
2. In the popup: approve the permissions.
3. **"Choose the Instagram accounts…"** → select `@kidstory64` (not "opt in to all" is
   fine, just make sure it's ticked).
4. **"Choose the Pages…"** → select **Kidstory** (ID `1354300511092158`).
5. Review screen → **Save**. The popup closes and a fresh **short-lived User token**
   loads into the token box.

### C3. Get the Page token + IG account ID
> Do **not** rely on `me/accounts` — for a Business-Portfolio-managed Page it returns
> `[]`. Query the Page node directly instead.

In the query bar, run (GET):
```
1354300511092158?fields=name,access_token,instagram_business_account{id,username}
```
Response looks like:
```json
{
  "name": "Kidstory",
  "access_token": "EAar...",           // a Page token, but NOT yet permanent
  "instagram_business_account": { "id": "17841436819683930", "username": "kidstory64" },
  "id": "1354300511092158"
}
```
Record `instagram_business_account.id` → that is `INSTAGRAM_ACCOUNT_ID`.

### C4. Make the token permanent
The token from C3 expires (it came from a short-lived User token). Turn it into a
never-expiring Page token:

1. Copy the **short-lived User token** from the Explorer's token box (switch **User or
   Page** back to **User Token** if needed).
2. Exchange it for a **long-lived User token** — paste in a browser, filling in the two
   values:
   ```
   https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=1363769955432126&client_secret=APP_SECRET&fb_exchange_token=SHORT_LIVED_USER_TOKEN
   ```
   → returns `{ "access_token": "<long-lived user token>", "token_type": "bearer" }`.
3. Use that long-lived User token to fetch the **permanent Page token**:
   ```
   https://graph.facebook.com/v21.0/1354300511092158?fields=access_token&access_token=LONG_LIVED_USER_TOKEN
   ```
   → returns `{ "access_token": "<permanent page token>", "id": "1354300511092158" }`.

That final `access_token` is `INSTAGRAM_ACCESS_TOKEN` **and** can serve as
`FACEBOOK_PAGE_ACCESS_TOKEN` (it has all the scopes). This project keeps them as two
separate env vars so either can be rotated independently.

### C5. Verify the token
```
https://graph.facebook.com/v21.0/debug_token?input_token=PERMANENT_PAGE_TOKEN&access_token=PERMANENT_PAGE_TOKEN
```
Check:
- `"type": "PAGE"`
- `"is_valid": true`
- `"expires_at": 0`  ← permanent
- `granular_scopes` includes `instagram_basic` and `instagram_content_publish` targeting
  `17841436819683930`

Confirm it can read the IG account:
```
https://graph.facebook.com/v21.0/17841436819683930?fields=id,username,media_count&access_token=PERMANENT_PAGE_TOKEN
```

> `data_access_expires_at` will be ~90 days out. That is Meta's standard "data access"
> window, not a hard token expiry — for an app in continuous use it keeps sliding
> forward. If posts start failing ~90 days after a long idle period, redo Part C.

---

## Part D — Put the values into the project

### D1. Local `.env`
```
FACEBOOK_PAGE_ID=1354300511092158
FACEBOOK_PAGE_ACCESS_TOKEN=<permanent page token>
INSTAGRAM_ACCOUNT_ID=17841436819683930
INSTAGRAM_ACCESS_TOKEN=<permanent page token>
YOUTUBE_CLIENT_ID=<oauth client id>
YOUTUBE_CLIENT_SECRET=<oauth client secret>
YOUTUBE_REFRESH_TOKEN=<from scripts/youtube-auth.mjs>
SITE_URL=https://storyland-sigma.vercel.app
```
`SITE_URL` matters when publishing from localhost: Facebook/Instagram fetch the story
link/image server-side and cannot reach `http://localhost:3000`.

### D2. Vercel (Project → Settings → Environment Variables)
Add the same `FACEBOOK_*` / `INSTAGRAM_*` / `YOUTUBE_*` vars (Vercel's env store is
separate from local `.env`). `SITE_URL` there can be left unset — the deployed origin is
public anyway. **Note:** the YouTube step renders video with `ffmpeg-static` (~80 MB
binary) and may exceed Vercel's serverless bundle limit — YouTube upload is expected to
run from the GitHub Actions job and local `/studio`, and to be skipped (logged, not
fatal) on Vercel.

### D3. GitHub Actions (repo → Settings → Secrets and variables → Actions)
`.github/workflows/auto-post.yml` reads these as secrets:
```
FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN,
INSTAGRAM_ACCOUNT_ID, INSTAGRAM_ACCESS_TOKEN,
YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
```
(plus the pre-existing `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NOTIFY_EMAILS`, `SITE_URL`).

### D4. Instagram bio link
Set `@kidstory64`'s **bio link** to the site — Instagram captions can't have tappable
links, so `shared/utils/instagram.ts` writes "tap the link in our bio".

---

## Part E — How posting works in code

| | Facebook | Instagram | YouTube |
|---|---|---|---|
| File | `shared/utils/facebook.ts` | `shared/utils/instagram.ts` | `shared/utils/youtube.ts` |
| Auth | permanent Page token | permanent Page token | OAuth2 refresh token (`googleapis`) |
| Call | 1× `POST /{page-id}/feed` (`message` + `link`) | `POST /{ig-id}/media` → poll `status_code` → `POST /{ig-id}/media_publish` | render MP4 with `ffmpeg-static` → `youtube.videos.insert` |
| Media | link preview card (story page OG tags) | the story's cover image (`buildCoverImageUrl`), required | silent ~25s 1080p video of the cover image, letterboxed |
| Failure | logged, never throws — a publish never fails because a post failed | same | same (temp files cleaned in `finally`) |

The Facebook and Instagram modules call `dns.setDefaultResultOrder('ipv4first')` because
this machine resolves `graph.facebook.com` to an unroutable IPv6 address first
(`ENETUNREACH` otherwise); `youtube.ts` does the same as a precaution.

All three are called in sequence after a successful publish in
`server/api/studio/publish.post.ts` and `scripts/daily-post.ts`, alongside the
new-story email.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `me/accounts` returns `[]` | Page is Business-Portfolio-managed. Query the Page node directly (C3). |
| `"The url you supplied is invalid"` (Facebook) | The `link` is `localhost`. Set `SITE_URL` in `.env` (or run on the deployed site). |
| IG `POST /media` fails with an image error | `image_url` must be a public JPEG, aspect ratio 4:5–1.91:1, ≤ 8 MB. Pollinations covers are 800×600 JPEG — fine; a slow first generation can time out, retry. |
| IG container never `FINISHED` | Transient Meta processing delay; the code polls 6×2 s then gives up (logged). |
| Everything 401/190 after months | Token revoked or data-access window lapsed. Redo Part C, update `.env` + Vercel + Actions. |
| `instagram_content_publish` "requires Advanced Access" | The account posting isn't a role-holder on the app. Add it under App → *App Roles*, or keep using the owner account that created the app. |
| YouTube upload `401 youtubeSignupRequired` | The authorized Google account has no YouTube channel. Create one at youtube.com, then re-run `scripts/youtube-auth.mjs`. |
| YouTube `invalid_grant` / stops working after ~1 week | OAuth app is still in "Testing". Publish it to Production (Y3), then re-run `scripts/youtube-auth.mjs`. |
| YouTube `youtube-auth.mjs` prints "(none returned)" | Google only sends a refresh token on first consent. Revoke at myaccount.google.com/permissions, re-run. |
| YouTube upload lands on the wrong channel | The account has multiple channels. Re-run the auth and pick the right one at the "choose a channel" step, or use an account with a single channel. |
| YouTube upload skipped on Vercel only | Expected — `ffmpeg-static` likely exceeds the serverless bundle limit. The GitHub Actions job and local `/studio` are the working paths. |
| `youtubeUploadLimitExceeded` / quota error | 10,000 units/day ≈ 6 uploads. Request more quota in the Cloud Console, or accept the cap. |
