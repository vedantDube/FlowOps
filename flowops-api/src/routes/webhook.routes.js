const express = require("express");
const router = express.Router();
const { githubWebhook } = require("../webhooks/github.webhook");

router.post("/github", githubWebhook);

module.exports = router;
