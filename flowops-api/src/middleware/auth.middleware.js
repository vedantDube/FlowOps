const { verifyToken } = require("../utils/jwt.utils");
const prisma = require("../services/prisma");

/**
 * Require a valid JWT in the Authorization header.
 * Attaches req.user (User row) and req.userId
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;
    req.userId = user.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Require the user to be a member of req.params.orgId or req.body.organizationId
 */
async function requireOrgMember(req, res, next) {
  const orgId = req.params.orgId || req.body.organizationId || req.query.orgId;
  if (!orgId)
    return res.status(400).json({ error: "Organization ID required" });

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: { userId: req.userId, organizationId: orgId },
    },
  });

  if (!membership)
    return res.status(403).json({ error: "Not a member of this organization" });

  req.membership = membership;
  req.orgId = orgId;
  next();
}

/**
 * Optional auth – attaches user if token present, continues either way
 */
async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });
      req.userId = req.user?.id;
    } catch {
      /* ignore */
    }
  }
  next();
}

module.exports = { requireAuth, requireOrgMember, optionalAuth };
