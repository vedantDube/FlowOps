const prisma = require("../services/prisma");

/**
 * Log an audit event to the database
 */
async function logAudit({
  userId,
  organizationId,
  action,
  resourceType,
  resourceId,
  metadata,
  ipAddress,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        resourceType,
        resourceId,
        metadata,
        ipAddress,
        userId: userId || null,
        organizationId: organizationId || null,
      },
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
}

/**
 * Express middleware that logs every authenticated request
 */
function auditMiddleware(action, resourceType) {
  return async (req, _res, next) => {
    await logAudit({
      userId: req.userId,
      organizationId: req.orgId,
      action,
      resourceType,
      resourceId: req.params.id,
      metadata: { method: req.method, path: req.path },
      ipAddress: req.ip,
    });
    next();
  };
}

module.exports = { logAudit, auditMiddleware };
