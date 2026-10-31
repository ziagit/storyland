// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    gmailUser: process.env.GMAIL_USER,
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
    notifyEmails: process.env.NOTIFY_EMAILS,
    siteUrl: process.env.SITE_URL,
    youtubeClientId: process.env.YOUTUBE_CLIENT_ID,
    youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    youtubeRefreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
    // Shared secret between Vercel Cron and /api/cron/daily-post — Vercel sends it
    // as `Authorization: Bearer ${CRON_SECRET}`; the route rejects anything else.
    cronSecret: process.env.CRON_SECRET,
    // Comma-separated emails allowed to sign in to /studio and call the studio/admin
    // routes. Empty means nobody — the studio fails closed.
    studioEmails: process.env.STUDIO_EMAILS,
    // kidstory-api companion service — every story read/write goes through it
    // instead of straight to Supabase. The key guards its write endpoints.
    kidstoryApiUrl: process.env.KIDSTORY_API_URL || 'http://localhost:8000',
    kidstoryApiKey: process.env.KIDSTORY_API_KEY,
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    }
  },
  routeRules: {
    // Auth lives in the browser (Supabase session in localStorage), so the server
    // can't tell who's asking: render these client-side only, behind the auth middleware.
    '/studio': { ssr: false },
    '/login': { ssr: false }
  },
  nitro: {
    // The daily-post cron route waits on two agent runs (story, then social) on
    // kidstory-api, each several Claude turns, plus the email. 300s is the Hobby
    // ceiling with Fluid compute, which kidstory-api already relies on (its
    // functions run up to 120s). Applies to all server routes (a higher ceiling
    // doesn't slow down routes that finish fast).
    vercel: {
      functions: {
        maxDuration: 300
      }
    }
  },
  vite: {
    server: {
      allowedHosts: ['.ngrok-free.app', '.ngrok.io']
    }
  },
  app: {
    head: {
      titleTemplate: '%s · Kidstory',
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  }
})
