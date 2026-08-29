// Framework-agnostic like shared/utils/story-authoring.ts — called from the Nitro
// /studio publish route and from the standalone scripts/daily-post.ts script, which
// runs outside the Nuxt/Nitro context.
import { Resend } from 'resend'
import type { StoryDraft } from './story-authoring'

const OWNER_EMAIL = 'zia.flutter@gmail.com'
const DEFAULT_SITE_URL = 'https://storyland-sigma.vercel.app'

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Emails the owner a copy of a freshly AI-published story. Never throws — a
 * notification failure should never block or fail the publish itself.
 */
export async function sendNewStoryEmail(
  resendApiKey: string | undefined,
  draft: StoryDraft,
  slug: string,
  siteUrl: string = DEFAULT_SITE_URL
): Promise<void> {
  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not configured — skipping new-story email notification.')
    return
  }

  try {
    const resend = new Resend(resendApiKey)
    const bodyHtml = draft.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n')

    const { error } = await resend.emails.send({
      // Resend's shared test sender — works without verifying a domain, but can only
      // deliver to the email address the Resend account itself was signed up with.
      from: 'Kidstory <onboarding@resend.dev>',
      to: OWNER_EMAIL,
      subject: `New story published: ${draft.title}`,
      html: `
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
    if (error) {
      console.error('Resend rejected the new-story email:', error)
    }
  } catch (err) {
    console.error('Failed to send new-story email notification:', err)
  }
}
