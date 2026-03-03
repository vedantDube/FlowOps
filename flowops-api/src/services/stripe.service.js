const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const PLANS = {
  free: { priceId: null, name: "Free", limit: 1 },
  pro: { priceId: process.env.STRIPE_PRO_PRICE_ID, name: "Pro", limit: 10 },
  enterprise: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    name: "Enterprise",
    limit: -1,
  },
};

/**
 * Create or retrieve a Stripe customer for an organization
 */
async function getOrCreateCustomer(orgId, orgName, email) {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0];

  return stripe.customers.create({
    email,
    name: orgName,
    metadata: { orgId },
  });
}

/**
 * Create a Stripe Checkout session for upgrading plan
 */
async function createCheckoutSession({
  customerId,
  priceId,
  orgId,
  successUrl,
  cancelUrl,
}) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orgId },
    subscription_data: { metadata: { orgId } },
  });
}

/**
 * Create a billing portal session for managing subscription
 */
async function createPortalSession(customerId, returnUrl) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Get subscription details
 */
async function getSubscription(subscriptionId) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Verify Stripe webhook signature and parse event
 */
function constructWebhookEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
}

module.exports = {
  stripe,
  PLANS,
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  constructWebhookEvent,
};
