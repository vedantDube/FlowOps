const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { getOnboardingStatus, completeOnboarding, sendWelcome } = require("../controllers/onboarding.controller");

router.get("/status", authenticate, getOnboardingStatus);
router.post("/complete", authenticate, completeOnboarding);
router.post("/welcome", authenticate, sendWelcome);

module.exports = router;
