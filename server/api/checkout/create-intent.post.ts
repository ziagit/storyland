import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.stripeSecretKey) {
    throw createError({ statusCode: 500, statusMessage: 'STRIPE_SECRET_KEY is not configured on the server.' })
  }

  const user = await getUserFromEvent(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in first.' })
  }

  if (await hasFullAccess(user.id)) {
    throw createError({ statusCode: 400, statusMessage: 'You already have full access.' })
  }

  const stripe = new Stripe(config.stripeSecretKey)
  const intent = await stripe.paymentIntents.create({
    amount: 999,
    currency: 'usd',
    description: 'Kidstory Full Access — one-time purchase',
    receipt_email: user.email || undefined,
    metadata: { user_id: user.id },
    // Card only — `automatic_payment_methods` would also offer Stripe Link, which
    // brings its own "Save my information for faster checkout" block (email, phone,
    // full name) independent of the billingDetails `fields` config on the Payment
    // Element. Restricting to card is what actually removes that block.
    payment_method_types: ['card']
  })

  return { clientSecret: intent.client_secret }
})
