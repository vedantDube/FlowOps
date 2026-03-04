const express = require("express");
const router = express.Router();
const {
  getSubscription,
  createCheckout,
  verifyPayment,
  cancelPlan,
  razorpayWebhook,
} = require("../controllers/billing.controller");
const {
  requireAuth,
  requireOrgMember,
} = require("../middleware/auth.middleware");

// Razorpay webhook — no auth (signature verified in handler)
router.post("/webhook", razorpayWebhook);

router.use(requireAuth);

router.get("/:orgId/subscription", requireOrgMember, getSubscription);
router.post("/checkout", createCheckout);
router.post("/verify", verifyPayment);
router.post("/:orgId/cancel", requireOrgMember, cancelPlan);

module.exports = router;
