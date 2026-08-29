import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.stripeSecretKey || !config.stripeWebhookSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe is not configured on the server.' })
  }

  const signature = getHeader(event, 'stripe-signature')
  const rawBody = await readRawBody(event)
  if (!signature || !rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Missing Stripe signature or body.' })
  }

  const stripe = new Stripe(config.stripeSecretKey)
  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret)
  } catch (err) {
    throw createError({ statusCode: 400, statusMessage: `Webhook signature verification failed: ${(err as Error).message}` })
  }

  if (stripeEvent.type === 'payment_intent.succeeded') {
    const intent = stripeEvent.data.object as Stripe.PaymentIntent
    const userId = intent.metadata?.user_id
    if (userId) {
      const supabase = useSupabaseAdmin()
      const { error } = await supabase.from('entitlements').upsert(
        {
          user_id: userId,
          stripe_customer_id: typeof intent.customer === 'string' ? intent.customer : (intent.customer?.id ?? null),
          stripe_payment_intent_id: intent.id,
          purchased_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
      if (error) {
        throw createError({ statusCode: 500, statusMessage: error.message })
      }
    }
  }

  return { received: true }
})
