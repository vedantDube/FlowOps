const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { chatLimiter } = require("../middleware/rate-limit.middleware");
const { sendChatMessageBody } = require("../utils/validators");
const ctrl = require("../controllers/chat.controller");

router.get("/conversations", requireAuth, ctrl.listConversations);
router.get("/thread/:userId", requireAuth, ctrl.getThread);
router.post("/thread/:userId", requireAuth, chatLimiter, validate({ body: sendChatMessageBody }), ctrl.postMessage);
router.put("/thread/:userId/read", requireAuth, ctrl.putRead);

module.exports = router;
