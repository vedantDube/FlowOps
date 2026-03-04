const express = require("express");
const router = express.Router();
const { publicLimiter } = require("../middleware/rate-limit.middleware");
const { getPublicReport } = require("../controllers/report.controller");

// Public endpoint — no auth required
router.get("/:slug", publicLimiter, getPublicReport);

module.exports = router;
