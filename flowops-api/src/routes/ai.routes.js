const express = require("express");
const router = express.Router();
const {
  reviewPR,
  listReviews,
  getReview,
  reviewCodeFromGithub,
} = require("../controllers/ai.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.use(requireAuth);

router.post("/review", reviewPR);
router.post("/review/github", reviewCodeFromGithub);
router.get("/reviews", listReviews);
router.get("/reviews/:id", getReview);

module.exports = router;
