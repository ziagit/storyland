// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    huggingfaceSpaceUrl: process.env.HUGGINGFACE_SPACE_URL,
    huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    gmailUser: process.env.GMAIL_USER,
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
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
