const prisma = require("../services/prisma");
const {
  PLANS,
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
} = require("../services/stripe.service");
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

// ── Create Stripe checkout session ────────────────────────────────────────────
exports.createCheckout = async (req, res) => {
  const { plan, orgId } = req.body;
  if (!PLANS[plan] || !PLANS[plan].priceId) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const customer = await getOrCreateCustomer(orgId, org.name, req.user.email);

    // Store customer ID if not already saved
    await prisma.subscription.upsert({
      where: { organizationId: orgId },
      update: { stripeCustomerId: customer.id },
      create: {
        organizationId: orgId,
        stripeCustomerId: customer.id,
        plan: "free",
        status: "active",
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const session = await createCheckoutSession({
      customerId: customer.id,
      priceId: PLANS[plan].priceId,
      orgId,
      successUrl: `${frontendUrl}/billing?success=true`,
      cancelUrl: `${frontendUrl}/billing?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Create customer portal session ────────────────────────────────────────────
exports.createPortal = async (req, res) => {
  const { orgId } = req.params;
  try {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    if (!sub?.stripeCustomerId)
      return res.status(400).json({ error: "No billing account found" });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const portal = await createPortalSession(
      sub.stripeCustomerId,
      `${frontendUrl}/billing`,
    );
    res.json({ url: portal.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Stripe webhook handler ─────────────────────────────────────────────────────
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = constructWebhookEvent(req.rawBody, sig);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orgId = session.metadata?.orgId;
      if (!orgId) return res.json({ received: true });

      await prisma.subscription.update({
        where: { organizationId: orgId },
        data: {
          stripeSubscriptionId: session.subscription,
          status: "active",
        },
      });
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object;
      const orgId = sub.metadata?.orgId;
      if (!orgId) return res.json({ received: true });

      const planName =
        Object.entries(PLANS).find(
          ([, p]) => p.priceId === sub.items.data[0]?.price.id,
        )?.[0] || "free";

      await prisma.subscription.update({
        where: { organizationId: orgId },
        data: {
          plan: planName,
          status: sub.status,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      });
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    res.status(500).json({ error: err.message });
  }
};
