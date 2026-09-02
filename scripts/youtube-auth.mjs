// One-time helper: get a YouTube refresh token for the auto-post integration.
//
//   node scripts/youtube-auth.mjs <CLIENT_ID> <CLIENT_SECRET>
//
// Opens the Google consent screen in your browser, catches the redirect on
// http://localhost:4576, and prints the refresh token to paste into .env as
// YOUTUBE_REFRESH_TOKEN (alongside YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET).
//
// Requires the OAuth client to be a "Desktop app" type and the consent screen to
// list the scope https://www.googleapis.com/auth/youtube.upload. Publish the OAuth
// app to Production first, or the refresh token stops working after 7 days. Sign in
// with the Google account whose YouTube channel should receive the uploads (that
// account must already have a channel — create one at youtube.com first).
import { createServer } from 'node:http'
import { exec } from 'node:child_process'
import { google } from 'googleapis'

const [clientId, clientSecret] = process.argv.slice(2)
if (!clientId || !clientSecret) {
  console.error('Usage: node scripts/youtube-auth.mjs <CLIENT_ID> <CLIENT_SECRET>')
  process.exit(1)
}

const PORT = 4576
const REDIRECT = `http://localhost:${PORT}`
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload'

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT)
const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // force a refresh_token even on repeat runs
  scope: [SCOPE]
})

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT)
  const code = url.searchParams.get('code')
  if (!code) {
    res.writeHead(400).end('No code in callback.')
    return
  }
  try {
    const { tokens } = await oauth2.getToken(code)
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('Done — you can close this tab and return to the terminal.')
    console.log('\n=== YOUR YOUTUBE REFRESH TOKEN ===\n')
    console.log(tokens.refresh_token || '(none returned — revoke the app at myaccount.google.com/permissions and retry)')
    console.log('\n=================================\n')
  } catch (err) {
    res.writeHead(500).end('Token exchange failed — see terminal.')
    console.error(err)
  } finally {
    server.close()
  }
})

server.listen(PORT, () => {
  console.log(`\nOpen this URL and approve access:\n\n${authUrl}\n`)
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  exec(`${opener} "${authUrl}"`, () => {})
})
