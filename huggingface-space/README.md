# Kidstory TTS Space

Runs `Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice` on Hugging Face's free **ZeroGPU**
pool to pre-generate story narration audio for Kidstory. Not designed for
live/public traffic — Kidstory's server calls the `generate` API once per
story and caches the result in Supabase Storage.

## One-time setup

1. **Check your account qualifies**: hosting a ZeroGPU Space needs a verified
   email and an account older than 30 days (huggingface.co/settings — Account
   page shows your join date). If your account is too new, you'll need to
   wait or use HF PRO instead.
2. **Create a new Space**: SDK = **Gradio**. A hardware option should appear
   on the same page — choose **ZeroGPU**. (If it's not shown there, create
   the Space and look for it under Settings → Hardware afterward.)
3. **Upload `app.py` and `requirements.txt`** (this folder) via the Space's
   "Files" tab → "Add file" → "Upload files". Don't upload this `README.md`
   — Hugging Face auto-generates its own with required metadata for the SDK
   you picked.
4. **Wait for it to build** (Logs tab) — the first build downloads the
   model, which can take a few minutes.
5. **Generate a Hugging Face access token** for Kidstory to use when calling
   this Space: Settings → Access Tokens → New token. A **fine-grained** token
   with just "Make calls to Inference Providers" / read access is enough —
   no need for write/repo scopes. (Don't reuse a broad token you've shared
   elsewhere; keep this one scoped to just this purpose.)
6. Note your Space's id, shown as `<your-username>/<space-name>` in its URL.

Give the Space id and the access token to the Kidstory app — they go into
its `.env` as `HUGGINGFACE_SPACE_URL` and `HUGGINGFACE_API_KEY`.

## Why a personal token is needed here

The Space itself is public and technically callable by anyone with no
token — but unauthenticated calls share a tiny 2-minutes/day quota across
*everyone*. Calling with your own token attributes usage to your account's
free quota instead (5 minutes/day). There's no separate secret/gate on the
`generate` endpoint beyond that — ZeroGPU's own per-account quota system is
the rate limit.

## Notes

- **5 minutes of GPU time/day** on a free account is not much — narrating
  all 35 existing stories in one sitting won't fit in a single day's quota.
  Run the backfill job in small batches spread across a few days rather than
  all at once.
- Inference on a real GPU (unlike CPU) should be fast per story — seconds,
  not minutes — so the quota goes toward number of stories per day, not
  raw compute time per story.
- `POST` calls go through the Gradio API's `generate` endpoint (see
  `app.py`'s `api_name="generate"`), called from Kidstory's server via the
  `@gradio/client` npm package, not a plain REST fetch.
