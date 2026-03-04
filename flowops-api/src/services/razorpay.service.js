const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLANS = {
  free: { planId: null, name: "Free", limit: 1, amount: 0 },
  pro: {
    planId: process.env.RAZORPAY_PRO_PLAN_ID,
    name: "Pro",
    limit: 10,
    amount: 249900, // ₹2,499 in paise
  },
  enterprise: {
    planId: process.env.RAZORPAY_ENTERPRISE_PLAN_ID,
    name: "Enterprise",
    limit: -1,
    amount: 849900, // ₹8,499 in paise
  },
};

/**
 * Create a Razorpay subscription
 */
async function createSubscription({ planId, orgId, orgName, email }) {
  return razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 12, // 12 billing cycles
    quantity: 1,
    notes: { orgId, orgName, email },
  });
}

/**
 * Create a Razorpay order (one-time payment alternative)
 */
async function createOrder({ amount, currency = "INR", orgId, plan }) {
  return razorpay.orders.create({
    amount,
    currency,
    receipt: `order_${orgId}_${Date.now()}`,
    notes: { orgId, plan },
  });
}

/**
 * Fetch subscription details
 */
async function fetchSubscription(subscriptionId) {
  return razorpay.subscriptions.fetch(subscriptionId);
}

/**
 * Cancel a subscription
 */
async function cancelSubscription(subscriptionId, cancelAtEnd = true) {
  return razorpay.subscriptions.cancel(subscriptionId, cancelAtEnd);
}

/**
 * Verify Razorpay payment signature
 */
function verifyPaymentSignature({
  razorpay_order_id,
  razorpay_subscription_id,
  razorpay_payment_id,
  razorpay_signature,
}) {
  const entity = razorpay_subscription_id || razorpay_order_id;
  const body = `${entity}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return expected === razorpay_signature;
}

/**
 * Verify Razorpay webhook signature
 */
function verifyWebhookSignature(rawBody, signature) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

module.exports = {
  razorpay,
  PLANS,
  createSubscription,
  createOrder,
  fetchSubscription,
  cancelSubscription,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
