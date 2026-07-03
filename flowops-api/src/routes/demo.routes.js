const express = require("express");
const router = express.Router();
const { getShowcase } = require("../controllers/demo.controller");
const { publicLimiter } = require("../middleware/rate-limit.middleware");

// Public — no auth. Read-only showcase of the seeded demo org.
router.get("/showcase", publicLimiter, getShowcase);

module.exports = router;
