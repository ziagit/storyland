// The site's chat bubble. Each message runs kidstory-api's support agent, which
// answers from what it knows about Kidstory and the catalog. This route is public
// (the API key stays on the server), so it caps message size and how often one
// visitor can ask. When the agent hands a chat off, the owner gets it by email.
import { KidstoryApiError, runSupportAgent } from '../../../shared/utils/kidstory-api'
import { parseRecipients, sendSupportHandoffEmail } from '../../../shared/utils/notify'
import type { ChatMessage } from '../../../shared/utils/story-authoring'

const MAX_MESSAGE_LENGTH = 1000
// Matches the support agent's own trim (MAX_HISTORY_TURNS in support_agent.py).
const MAX_HISTORY = 12
// Per visitor IP. In memory, so it resets when the function cold-starts: it stops
// someone hammering the chat from one tab, not a determined abuser.
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 20

const recentRequests = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const times = (recentRequests.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (times.length >= RATE_LIMIT) {
    recentRequests.set(ip, times)
    return true
  }
  times.push(now)
  recentRequests.set(ip, times)
  if (recentRequests.size > 5000) recentRequests.clear()
  return false
}

function cleanHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (m): m is ChatMessage =>
        (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string' && m.content.trim() !== ''
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ message?: unknown; history?: unknown }>(event)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) {
    throw createError({ statusCode: 400, statusMessage: 'Type a message first.' })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `Please keep messages under ${MAX_MESSAGE_LENGTH} characters.` })
  }
  if (rateLimited(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown')) {
    throw createError({ statusCode: 429, statusMessage: "You're sending messages quickly. Please wait a few minutes." })
  }

  const readerToken = getReaderToken(event)
  let result
  try {
    result = await runSupportAgent(useKidstoryApi(), { message, history: cleanHistory(body?.history) }, readerToken)
  } catch (err) {
    if (err instanceof KidstoryApiError) {
      console.error('Support agent failed:', err.message)
      throw createError({
        statusCode: err.statusCode === 429 ? 429 : 502,
        statusMessage: 'The helper is unavailable right now. Please try again, or write to us at /contact.'
      })
    }
    throw err
  }

  let handedOff = false
  if (result.handoff) {
    const config = useRuntimeConfig()
    const user = readerToken ? await getUserFromEvent(event) : null
    handedOff = await sendSupportHandoffEmail(
      { user: config.gmailUser, appPassword: config.gmailAppPassword },
      {
        summary: result.handoff.summary,
        replyTo: result.handoff.contactEmail || user?.email || null,
        signedIn: !!user,
        transcript: result.history
      },
      parseRecipients(config.notifyEmails)
    )
  }

  // The agent was told the owner will reply; if the email didn't go out, say so.
  const reply =
    result.handoff && !handedOff
      ? `${result.reply}\n\n(Our message to the team didn't go through, so please also write to us at /contact.)`
      : result.reply
  const history = result.handoff && !handedOff ? [...result.history.slice(0, -1), { role: 'assistant' as const, content: reply }] : result.history
  return { reply, handedOff, history }
})
