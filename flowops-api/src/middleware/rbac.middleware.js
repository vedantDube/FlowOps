const prisma = require("../services/prisma");
const logger = require("../utils/logger");

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
    const orgId = req.orgId || req.params.orgId || req.body?.organizationId || req.query.orgId;
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
      logger.error({ err }, "RBAC check error");
      return res.status(500).json({ error: "Authorization check failed" });
    }
  };
}

/**
 * Require that the caller belongs to the org the request is scoped to —
 * any role, viewers included. For read-only endpoints (metrics, leaderboards,
 * review lists) where requireRole's explicit role levels are overkill but
 * cross-tenant reads must still be impossible. Accepts orgId from
 * params/query/body, or derives the org from repoId when only a repo is
 * referenced. Requests with neither are rejected: unscoped queries would
 * aggregate data across every tenant.
 */
async function requireOrgAccess(req, res, next) {
  try {
    let orgId =
      req.params.orgId || req.query.orgId || req.body?.organizationId;

    const repoId = req.query.repoId || req.body?.repositoryId;
    if (!orgId && repoId) {
      const repo = await prisma.repository.findUnique({
        where: { id: repoId },
        select: { organizationId: true },
      });
      if (!repo) return res.status(404).json({ error: "Repository not found" });
      orgId = repo.organizationId;
    }

    if (!orgId) {
      return res
        .status(400)
        .json({ error: "orgId or repoId is required" });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: req.userId, organizationId: orgId },
      },
    });
    if (!membership) {
      return res.status(403).json({ error: "Not a member of this organization" });
    }

    req.membership = membership;
    req.userRole = membership.role;
    next();
  } catch (err) {
    logger.error({ err }, "Org access check error");
    return res.status(500).json({ error: "Authorization check failed" });
  }
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

module.exports = { requireRole, requireAdmin, requireOwner, requireMember, requireOrgAccess, ROLE_HIERARCHY };
