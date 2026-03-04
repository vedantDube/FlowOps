const prisma = require("../services/prisma");
const {
  PLANS,
  createSubscription,
  createOrder,
  fetchSubscription: fetchRazorpaySub,
  cancelSubscription,
  verifyPaymentSignature,
  verifyWebhookSignature,
} = require("../services/razorpay.service");
const { logAudit } = require("../middleware/audit.middleware");

// ── Get current plan info ──────────────────────────────────────────────────────
exports.getSubscription = async (req, res) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: req.params.orgId },
    });
    if (!sub) return res.status(404).json({ error: "No subscription found" });
    res.json({ ...sub, planDetails: PLANS[sub.plan] || PLANS.free });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Create Razorpay subscription / order ──────────────────────────────────────
exports.createCheckout = async (req, res) => {
  const { plan, orgId } = req.body;
  if (!PLANS[plan] || !PLANS[plan].planId) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });

    // Create Razorpay subscription
    const subscription = await createSubscription({
      planId: PLANS[plan].planId,
      orgId,
      orgName: org.name,
      email: req.user.email || "",
    });

    // Upsert local subscription record
    await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: { razorpaySubscriptionId: subscription.id },
      create: {
        organizationId: orgId,
        razorpaySubscriptionId: subscription.id,
        plan: "free",
        status: "created",
      },
    });

    res.json({
      subscriptionId: subscription.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      amount: PLANS[plan].amount,
      currency: "INR",
      planName: PLANS[plan].name,
      orgName: org.name,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Verify Razorpay payment ───────────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  const {
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
    orgId,
    plan,
  } = req.body;

  try {
    const isValid = verifyPaymentSignature({
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    // Update local subscription
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: {
        plan: plan || "pro",
        status: "active",
        razorpaySubscriptionId: razorpay_subscription_id,
        razorpayPaymentId: razorpay_payment_id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      create: {
        organizationId: orgId,
        plan: plan || "pro",
        status: "active",
        razorpaySubscriptionId: razorpay_subscription_id,
        razorpayPaymentId: razorpay_payment_id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    await logAudit({
      userId: req.userId,
      organizationId: orgId,
      action: "billing.plan_upgraded",
      resourceType: "Subscription",
      metadata: { plan, razorpay_payment_id },
    });

    res.json({ success: true, message: `Upgraded to ${plan} plan` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Cancel subscription ───────────────────────────────────────────────────────
exports.cancelPlan = async (req, res) => {
  const { orgId } = req.params;
  try {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    if (!sub?.razorpaySubscriptionId) {
      return res.status(400).json({ error: "No active subscription found" });
    }

    await cancelSubscription(sub.razorpaySubscriptionId, true);

    await prisma.subscription.update({
      where: { organizationId: orgId },
      data: { cancelAtPeriodEnd: true },
    });

    await logAudit({
      userId: req.userId,
      organizationId: orgId,
      action: "billing.plan_cancelled",
      resourceType: "Subscription",
    });

    res.json({ message: "Subscription will cancel at end of billing period" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Razorpay webhook handler ──────────────────────────────────────────────────
exports.razorpayWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  try {
    const rawBody =
      typeof req.rawBody === "string"
        ? req.rawBody
        : req.rawBody?.toString("utf8") || JSON.stringify(req.body);

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body;
    const entity = event.payload?.subscription?.entity || event.payload?.payment?.entity;

    if (event.event === "subscription.activated") {
      const orgId = entity?.notes?.orgId;
      if (!orgId) return res.json({ received: true });

      const planName =
        Object.entries(PLANS).find(
          ([, p]) => p.planId === entity.plan_id,
        )?.[0] || "pro";

      await prisma.subscription.update({
        where: { organizationId: orgId },
        data: {
          plan: planName,
          status: "active",
          razorpaySubscriptionId: entity.id,
          currentPeriodStart: new Date(entity.current_start * 1000),
          currentPeriodEnd: new Date(entity.current_end * 1000),
        },
      });
    }

    if (event.event === "subscription.cancelled" || event.event === "subscription.completed") {
      const orgId = entity?.notes?.orgId;
      if (!orgId) return res.json({ received: true });

      await prisma.subscription.update({
        where: { organizationId: orgId },
        data: {
          status: event.event === "subscription.cancelled" ? "cancelled" : "completed",
          cancelAtPeriodEnd: false,
        },
      });
    }

    if (event.event === "payment.failed") {
      const subEntity = event.payload?.payment?.entity;
      const orgId = subEntity?.notes?.orgId;
      if (orgId) {
        await prisma.subscription.update({
          where: { organizationId: orgId },
          data: { status: "past_due" },
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Razorpay webhook error:", err);
    res.status(500).json({ error: err.message });
  }
};
