const Razorpay = require("razorpay");
const crypto = require("crypto");

let _razorpay = null;

function getRazorpay() {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID) {
      throw new Error(
        "RAZORPAY_KEY_ID is not set. Add it to your environment variables.",
      );
    }
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

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
  return getRazorpay().subscriptions.create({
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
  return getRazorpay().orders.create({
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
  return getRazorpay().subscriptions.fetch(subscriptionId);
}

/**
 * Cancel a subscription
 */
async function cancelSubscription(subscriptionId, cancelAtEnd = true) {
  return getRazorpay().subscriptions.cancel(subscriptionId, cancelAtEnd);
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
  getRazorpay,
  PLANS,
  createSubscription,
  createOrder,
  fetchSubscription,
  cancelSubscription,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
