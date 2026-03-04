const prisma = require("../services/prisma");

/**
 * Plan limits configuration
 * Feature #1: Plan Enforcement & Usage Gating
 */
const PLAN_LIMITS = {
  free: {
    maxRepos: 2,
    maxAIReviews: 10,       // per month
    maxDocGenerations: 5,   // per month
    maxApiCalls: 100,       // per month
    features: ["metrics", "github"],
  },
  pro: {
    maxRepos: 15,
    maxAIReviews: -1,       // unlimited
    maxDocGenerations: -1,
    maxApiCalls: 10000,
    features: ["metrics", "github", "ai_review", "autodocs", "team", "slack", "jira", "audit"],
  },
  enterprise: {
    maxRepos: -1,           // unlimited
    maxAIReviews: -1,
    maxDocGenerations: -1,
    maxApiCalls: -1,
    features: ["metrics", "github", "ai_review", "autodocs", "team", "slack", "jira", "audit", "sso", "custom_models", "api_keys", "white_label", "compliance"],
  },
};

/**
 * Get the current billing period start/end
 */
function getCurrentPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Get usage count for an org in the current billing period
 */
async function getUsageCount(orgId, action) {
  const { start, end } = getCurrentPeriod();
  const result = await prisma.usageRecord.aggregate({
    where: {
      organizationId: orgId,
      action,
      periodStart: { gte: start },
      periodEnd: { lte: end },
    },
    _sum: { count: true },
  });
  return result._sum.count || 0;
}

/**
 * Record a usage event
 */
async function recordUsage(orgId, action, count = 1) {
  const { start, end } = getCurrentPeriod();
  await prisma.usageRecord.create({
    data: {
      organizationId: orgId,
      action,
      count,
      periodStart: start,
      periodEnd: end,
    },
  });
}

/**
 * Middleware: Check if the org's plan allows a specific feature
 */
function requireFeature(feature) {
  return async (req, res, next) => {
    const orgId = req.orgId || req.params.orgId || req.body.organizationId || req.query.orgId;
    if (!orgId) return res.status(400).json({ error: "Organization ID required" });

    try {
      const sub = await prisma.subscription.findUnique({
        where: { organizationId: orgId },
      });
      const plan = sub?.plan || "free";
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

      if (!limits.features.includes(feature)) {
        return res.status(403).json({
          error: "Feature not available on your plan",
          feature,
          currentPlan: plan,
          requiredPlan: feature === "sso" || feature === "custom_models" ? "enterprise" : "pro",
        });
      }

      req.planLimits = limits;
      req.currentPlan = plan;
      next();
    } catch (err) {
      console.error("Plan check error:", err.message);
      next(); // fail open
    }
  };
}

/**
 * Middleware: Check repo limit before connecting a new repo
 */
async function checkRepoLimit(req, res, next) {
  const orgId = req.params.orgId || req.body.organizationId;
  if (!orgId) return next();

  try {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    const plan = sub?.plan || "free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    if (limits.maxRepos === -1) return next(); // unlimited

    const repoCount = await prisma.repository.count({
      where: { organizationId: orgId },
    });

    if (repoCount >= limits.maxRepos) {
      return res.status(403).json({
        error: `Repository limit reached (${limits.maxRepos} on ${plan} plan)`,
        currentPlan: plan,
        limit: limits.maxRepos,
        current: repoCount,
      });
    }
    next();
  } catch (err) {
    console.error("Repo limit check error:", err.message);
    next();
  }
}

/**
 * Middleware: Check AI review usage limit
 */
async function checkAIReviewLimit(req, res, next) {
  const orgId = req.body.organizationId || req.query.orgId;
  if (!orgId) return next();

  try {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    const plan = sub?.plan || "free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    if (limits.maxAIReviews === -1) return next();

    const usage = await getUsageCount(orgId, "ai_review");
    if (usage >= limits.maxAIReviews) {
      return res.status(403).json({
        error: `AI review limit reached (${limits.maxAIReviews}/month on ${plan} plan)`,
        currentPlan: plan,
        limit: limits.maxAIReviews,
        used: usage,
      });
    }
    next();
  } catch (err) {
    console.error("AI review limit check error:", err.message);
    next();
  }
}

/**
 * Middleware: Check doc generation usage limit
 */
async function checkDocLimit(req, res, next) {
  const orgId = req.body.organizationId || req.query.orgId;
  if (!orgId) return next();

  try {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    const plan = sub?.plan || "free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    if (limits.maxDocGenerations === -1) return next();

    const usage = await getUsageCount(orgId, "doc_generation");
    if (usage >= limits.maxDocGenerations) {
      return res.status(403).json({
        error: `Document generation limit reached (${limits.maxDocGenerations}/month on ${plan} plan)`,
        currentPlan: plan,
        limit: limits.maxDocGenerations,
        used: usage,
      });
    }
    next();
  } catch (err) {
    console.error("Doc limit check error:", err.message);
    next();
  }
}

module.exports = {
  PLAN_LIMITS,
  getCurrentPeriod,
  getUsageCount,
  recordUsage,
  requireFeature,
  checkRepoLimit,
  checkAIReviewLimit,
  checkDocLimit,
};
