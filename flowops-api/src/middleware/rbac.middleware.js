const prisma = require("../services/prisma");

/**
 * Feature #3: RBAC Enforcement Middleware
 * Checks that the authenticated user has the required role in the org.
 * Roles hierarchy: owner > admin > member > viewer
 */

const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

/**
 * Middleware factory: require a minimum role level
 * @param {string} minRole - Minimum role required (owner | admin | member | viewer)
 */
function requireRole(minRole) {
  return async (req, res, next) => {
    const orgId = req.orgId || req.params.orgId || req.body.organizationId || req.query.orgId;
    if (!orgId) return res.status(400).json({ error: "Organization ID required" });

    try {
      const membership = req.membership || await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: { userId: req.userId, organizationId: orgId },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: "Not a member of this organization" });
      }

      const userLevel = ROLE_HIERARCHY[membership.role] || 0;
      const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          error: `Insufficient permissions. Required: ${minRole}, your role: ${membership.role}`,
          requiredRole: minRole,
          currentRole: membership.role,
        });
      }

      req.membership = membership;
      req.userRole = membership.role;
      next();
    } catch (err) {
      console.error("RBAC check error:", err.message);
      return res.status(500).json({ error: "Authorization check failed" });
    }
  };
}

/**
 * Require at least admin role
 */
const requireAdmin = requireRole("admin");

/**
 * Require owner role
 */
const requireOwner = requireRole("owner");

/**
 * Require at least member role (blocks viewers)
 */
const requireMember = requireRole("member");

module.exports = { requireRole, requireAdmin, requireOwner, requireMember, ROLE_HIERARCHY };
