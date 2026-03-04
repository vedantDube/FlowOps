const prisma = require("../services/prisma");
const { generateApiKey, hashApiKey } = require("../middleware/api-key.middleware");
const { logAudit } = require("../middleware/audit.middleware");

/**
 * Feature #12: API Keys Controller
 */

// ── Create a new API key ───────────────────────────────────────────────────────
exports.createApiKey = async (req, res) => {
  try {
    const { name, scopes = ["*"], expiresInDays } = req.body;
    const orgId = req.params.orgId;

    if (!name) return res.status(400).json({ error: "API key name is required" });

    const { key, keyHash, keyPrefix } = generateApiKey();

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        scopes,
        expiresAt,
        organizationId: orgId,
        createdById: req.userId,
      },
    });

    await logAudit({
      userId: req.userId,
      organizationId: orgId,
      action: "api_key.created",
      resourceType: "ApiKey",
      resourceId: apiKey.id,
      metadata: { name, scopes },
    });

    // Return the full key only once — it cannot be retrieved again
    res.json({
      id: apiKey.id,
      name: apiKey.name,
      key, // Only returned on creation!
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── List API keys for an org ───────────────────────────────────────────────────
exports.listApiKeys = async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { organizationId: req.params.orgId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        createdBy: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Revoke (delete) an API key ────────────────────────────────────────────────
exports.revokeApiKey = async (req, res) => {
  try {
    const key = await prisma.apiKey.findUnique({
      where: { id: req.params.keyId },
    });
    if (!key || key.organizationId !== req.params.orgId) {
      return res.status(404).json({ error: "API key not found" });
    }

    await prisma.apiKey.delete({ where: { id: req.params.keyId } });

    await logAudit({
      userId: req.userId,
      organizationId: req.params.orgId,
      action: "api_key.revoked",
      resourceType: "ApiKey",
      resourceId: req.params.keyId,
      metadata: { name: key.name },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
