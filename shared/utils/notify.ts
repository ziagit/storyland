// Framework-agnostic like shared/utils/story-authoring.ts — called from the Nitro
// /studio publish route and from the standalone scripts/daily-post.ts script, which
// runs outside the Nuxt/Nitro context.
import nodemailer from 'nodemailer'
import { buildCoverImageUrl } from '../../server/utils/cover-image'
import type { StoryDraft } from './story-authoring'

const OWNER_EMAIL = 'zia.flutter@gmail.com'
const DEFAULT_SITE_URL = 'https://storyland-sigma.vercel.app'

export interface GmailCredentials {
  user: string | undefined
  appPassword: string | undefined
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Emails the owner a copy of a freshly AI-published story, sent via the owner's own
 * Gmail account over SMTP (an App Password, not the real account password — Google
 * blocks plain-password SMTP). Never throws — a notification failure should never
 * block or fail the publish itself.
 */
export async function sendNewStoryEmail(
  credentials: GmailCredentials,
  draft: StoryDraft,
  slug: string,
  siteUrl: string = DEFAULT_SITE_URL
): Promise<void> {
  if (!credentials.user || !credentials.appPassword) {
    console.error('GMAIL_USER/GMAIL_APP_PASSWORD are not configured — skipping new-story email notification.')
    return
  }

  try {
    const transporter = nodemailer.createTransport({
      // Explicit host/port/family instead of the `service: 'gmail'` shorthand — that
      // shorthand attempted an IPv6 connection first and failed with ENETUNREACH in
      // testing; forcing IPv4 connects reliably instead.
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      family: 4,
      auth: { user: credentials.user, pass: credentials.appPassword }
    })

    const bodyHtml = draft.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n')
    // Same deterministic formula publishStoryDraft() uses to compute cover_image_url —
    // recomputing it here (rather than threading the value through) keeps this
    // notification self-contained with the same three inputs it already has.
    const coverImageUrl = buildCoverImageUrl({ title: draft.title, category: draft.category, slug })

    await transporter.sendMail({
      from: `Kidstory <${credentials.user}>`,
      to: OWNER_EMAIL,
      subject: `New story published: ${draft.title}`,
      html: `
        <img
          src="${coverImageUrl}"
          alt="${escapeHtml(draft.title)}"
          width="600"
          style="display:block;width:100%;max-width:600px;height:auto;border-radius:16px;margin-bottom:16px;"
        />
        <h2 style="margin-bottom:4px;">${escapeHtml(draft.title)} ${escapeHtml(draft.emoji)}</h2>
        <p style="color:#5B5347;"><em>${escapeHtml(draft.excerpt)}</em></p>
        <p style="font-size:13px;color:#5B5347;">
          Category: ${escapeHtml(draft.category)} &middot; Age range: ${escapeHtml(draft.ageRange)} &middot; ${draft.readTimeMinutes} min read
        </p>
        <hr style="border:none;border-top:1px solid #E9DAB8;margin:16px 0;" />
        ${bodyHtml}
        <p style="margin-top:24px;"><a href="${siteUrl}/stories/${slug}">Read it live on Kidstory &rarr;</a></p>
      `
    })
  } catch (err) {
    console.error('Failed to send new-story email notification:', err)
  }
}
