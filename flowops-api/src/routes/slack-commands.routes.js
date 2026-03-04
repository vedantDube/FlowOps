const express = require("express");
const router = express.Router();
const { handleSlashCommand } = require("../controllers/slack-commands.controller");

// Slack sends POST to this endpoint for slash commands
router.post("/commands", handleSlashCommand);

module.exports = router;
