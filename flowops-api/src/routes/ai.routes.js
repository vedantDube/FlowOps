const express = require("express");
const router = express.Router();
const {
  reviewPR,
  listReviews,
  getReview,
  reviewCodeFromGithub,
  askAssistant,
  generateNarrative,
  generateStandupSummary,
} = require("../controllers/ai.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { assistantLimiter } = require("../middleware/rate-limit.middleware");

router.use(requireAuth);

router.post("/review", reviewPR);
router.post("/review/github", reviewCodeFromGithub);
router.get("/reviews", listReviews);
router.get("/reviews/:id", getReview);
router.post("/assistant", assistantLimiter, askAssistant);
router.post("/narrative", assistantLimiter, generateNarrative);
router.post("/standup", assistantLimiter, generateStandupSummary);

module.exports = router;
