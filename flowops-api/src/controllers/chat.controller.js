const { getThread, sendMessage, markThreadRead, listConversations } = require("../services/chat.service");

// ── List conversations (one row per teammate, with last message + unread count)
exports.listConversations = async (req, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
  try {
    const conversations = await listConversations({ organizationId: orgId, userId: req.userId });
    res.json(conversations);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ── Get message history with a teammate ───────────────────────────────────────
exports.getThread = async (req, res) => {
  const { orgId, before } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
  try {
    const messages = await getThread({
      organizationId: orgId,
      userId: req.userId,
      peerId: req.params.userId,
      before,
    });
    res.json(messages);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ── Send a message to a teammate ───────────────────────────────────────────────
exports.postMessage = async (req, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
  try {
    const message = await sendMessage({
      organizationId: orgId,
      senderId: req.userId,
      recipientId: req.params.userId,
      body: req.body.body,
    });
    res.status(201).json(message);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ── Mark a thread as read ──────────────────────────────────────────────────────
exports.putRead = async (req, res) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });
  try {
    await markThreadRead({ organizationId: orgId, userId: req.userId, peerId: req.params.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};
