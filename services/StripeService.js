let stripe = null;
try {
  if (process.env.STRIPE_SECRET) {
    // instantiate stripe only when key provided
    // import dynamically to avoid hard dependency when not configured
    const Stripe = (await import('stripe')).default;
    stripe = Stripe(process.env.STRIPE_SECRET);
  }
} catch (e) {
  // ignore — stripe not installed or key invalid
  stripe = null;
}

export const StripeService = {
  constructEvent(payload, signature) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (secret && signature && stripe && stripe.webhooks) {
      // payload should be raw Buffer
      return stripe.webhooks.constructEvent(payload, signature, secret);
    }

    // Fallback: try parsing JSON body (best-effort)
    try {
      if (Buffer.isBuffer(payload)) return JSON.parse(payload.toString());
      return typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch (err) {
      // Return raw payload if parsing fails
      return payload;
    }
  }
};
