const express = require("express");
const router = express.Router();
const {
  getSubscription,
  createCheckout,
  createPortal,
  stripeWebhook,
} = require("../controllers/billing.controller");
const {
  requireAuth,
  requireOrgMember,
} = require("../middleware/auth.middleware");

// Stripe webhook — no auth (raw body already set in App.js)
router.post("/webhook", stripeWebhook);

router.use(requireAuth);

router.get("/:orgId/subscription", requireOrgMember, getSubscription);
router.post("/checkout", createCheckout);
router.post("/:orgId/portal", requireOrgMember, createPortal);

module.exports = router;
