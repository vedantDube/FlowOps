const prisma = require("../services/prisma");
const { getUsageCount, getCurrentPeriod, PLAN_LIMITS } = require("../middleware/plan.middleware");

/**
 * Feature #2: Usage Metering Controller
 */

// ── Get usage summary for an org ───────────────────────────────────────────────
exports.getUsageSummary = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { start, end } = getCurrentPeriod();

    const sub = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    const plan = sub?.plan || "free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    const [aiReviews, docGenerations, apiCalls, repoCount] = await Promise.all([
      getUsageCount(orgId, "ai_review"),
      getUsageCount(orgId, "doc_generation"),
      getUsageCount(orgId, "api_call"),
      prisma.repository.count({ where: { organizationId: orgId } }),
    ]);

    res.json({
      plan,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      usage: {
        aiReviews: { used: aiReviews, limit: limits.maxAIReviews },
        docGenerations: { used: docGenerations, limit: limits.maxDocGenerations },
        apiCalls: { used: apiCalls, limit: limits.maxApiCalls },
        repos: { used: repoCount, limit: limits.maxRepos },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get usage history (last 6 months) ──────────────────────────────────────────
exports.getUsageHistory = async (req, res) => {
  try {
    const { orgId } = req.params;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const records = await prisma.usageRecord.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: sixMonthsAgo },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by month and action
    const grouped = {};
    for (const r of records) {
      const month = r.periodStart.toISOString().slice(0, 7);
      if (!grouped[month]) grouped[month] = { month, ai_review: 0, doc_generation: 0, api_call: 0 };
      grouped[month][r.action] = (grouped[month][r.action] || 0) + r.count;
    }

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
