// Framework-agnostic like shared/utils/story-authoring.ts. Sends the support chat's
// hand-off emails. The new-story email moved to kidstory-api's social agent.
import nodemailer from 'nodemailer'

const DEFAULT_RECIPIENTS = ['zia.flutter@gmail.com']

export interface GmailCredentials {
  user: string | undefined
  appPassword: string | undefined
}

/** Parses the comma-separated NOTIFY_EMAILS env var into a list, or undefined if unset
 * (letting the sender fall back to its own default recipient). */
export function parseRecipients(notifyEmails: string | undefined): string[] | undefined {
  if (!notifyEmails) return undefined
  const emails = notifyEmails
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
  return emails.length ? emails : undefined
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface SupportHandoffEmail {
  summary: string
  // Where to reply: what the reader typed, or their account email when signed in.
  replyTo: string | null
  signedIn: boolean
  transcript: { role: 'user' | 'assistant'; content: string }[]
}

/**
 * Emails the owner a chat the support agent handed off (a refund, a payment that
 * didn't unlock, a bug), with the reader's address as Reply-To so answering the
 * email answers the reader. Never throws; returns whether
 * it was sent so the chat route can tell the reader to use /contact instead.
 */
export async function sendSupportHandoffEmail(
  credentials: GmailCredentials,
  handoff: SupportHandoffEmail,
  recipients: string[] = DEFAULT_RECIPIENTS
): Promise<boolean> {
  if (!credentials.user || !credentials.appPassword) {
    console.error('GMAIL_USER/GMAIL_APP_PASSWORD are not configured — skipping support handoff email.')
    return false
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      family: 4,
      auth: { user: credentials.user, pass: credentials.appPassword }
    })

    const transcriptHtml = handoff.transcript
      .map(
        (turn) =>
          `<p><strong>${turn.role === 'user' ? 'Reader' : 'Support agent'}:</strong> ${escapeHtml(turn.content).replace(/\n/g, '<br />')}</p>`
      )
      .join('\n')

    await transporter.sendMail({
      from: `Kidstory Support <${credentials.user}>`,
      to: recipients,
      replyTo: handoff.replyTo || undefined,
      subject: `Support request: ${handoff.summary.slice(0, 80)}`,
      html: `
        <h2 style="margin-bottom:4px;">A reader needs help</h2>
        <p>${escapeHtml(handoff.summary)}</p>
        <p style="font-size:13px;color:#5B5347;">
          Reply to: ${handoff.replyTo ? escapeHtml(handoff.replyTo) : '(no email given)'} &middot;
          ${handoff.signedIn ? 'signed in' : 'not signed in'}
        </p>
        <hr style="border:none;border-top:1px solid #E9DAB8;margin:16px 0;" />
        ${transcriptHtml}
      `
    })
    return true
  } catch (err) {
    console.error('Failed to send support handoff email:', err)
    return false
  }
}
