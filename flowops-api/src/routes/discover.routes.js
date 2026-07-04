const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { aiLimiter } = require("../middleware/rate-limit.middleware");
const { discoverSearchBody } = require("../utils/validators");
const { search } = require("../controllers/discover.controller");

router.post("/search", requireAuth, aiLimiter, validate({ body: discoverSearchBody }), search);

module.exports = router;
