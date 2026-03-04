const crypto = require("crypto");
const prisma = require("../services/prisma");
const logger = require("../utils/logger");

/**
 * Feature #12: API Key Authentication Middleware
 * Allows external API access using API keys instead of JWT tokens
 */

/**
 * Hash an API key for secure storage
 */
function hashApiKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Generate a new API key
 * Returns { key, keyHash, keyPrefix }
 */
function generateApiKey() {
  const key = `fops_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = hashApiKey(key);
  const keyPrefix = key.slice(0, 12);
  return { key, keyHash, keyPrefix };
}

/**
 * Middleware: Authenticate via API key (X-API-Key header)
 * Falls through to next middleware if no API key is present (allows JWT fallback)
 */
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) return next(); // no API key, try JWT

  try {
    const keyHash = hashApiKey(apiKey);
    const record = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        organization: { include: { subscription: true } },
        createdBy: true,
      },
    });

    if (!record) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    // Check expiration
    if (record.expiresAt && new Date() > record.expiresAt) {
      return res.status(401).json({ error: "API key has expired" });
    }

    // Update last used timestamp (non-blocking)
    prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    // Attach user/org context
    req.user = record.createdBy;
    req.userId = record.createdBy.id;
    req.orgId = record.organizationId;
    req.apiKey = record;
    req.isApiKeyAuth = true;

    next();
  } catch (err) {
    logger.error({ err }, "API key auth error");
    return res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * Middleware: Check API key has required scope
 */
function requireScope(scope) {
  return (req, res, next) => {
    if (!req.isApiKeyAuth) return next(); // JWT auth, skip scope check

    const scopes = req.apiKey?.scopes || [];
    if (!scopes.includes(scope) && !scopes.includes("*")) {
      return res.status(403).json({
        error: `API key missing required scope: ${scope}`,
        requiredScope: scope,
        currentScopes: scopes,
      });
    }
    next();
  };
}

module.exports = { hashApiKey, generateApiKey, authenticateApiKey, requireScope };
