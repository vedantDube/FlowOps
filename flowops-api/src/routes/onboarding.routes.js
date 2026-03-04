const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { onboardingBody } = require("../utils/validators");
const { getOnboardingStatus, completeOnboarding, sendWelcome } = require("../controllers/onboarding.controller");

router.get("/status", requireAuth, getOnboardingStatus);
router.post("/complete", requireAuth, validate({ body: onboardingBody }), completeOnboarding);
router.post("/welcome", requireAuth, sendWelcome);

module.exports = router;
