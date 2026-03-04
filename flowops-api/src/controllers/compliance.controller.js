const prisma = require("../services/prisma");
const { logAudit } = require("../middleware/audit.middleware");

/**
 * Feature #14: SOC2 / Compliance Controller
 * Data retention, export, and compliance management
 */

// ── Export all org data (GDPR compliance) ──────────────────────────────────────
exports.exportOrgData = async (req, res) => {
  try {
    const { orgId } = req.params;

    const [org, members, repos, commits, prs, reviews, aiReviews, docs, sprints, integrations, auditLogs] =
      await Promise.all([
        prisma.organization.findUnique({ where: { id: orgId } }),
        prisma.organizationMember.findMany({
          where: { organizationId: orgId },
          include: { user: { select: { username: true, email: true, createdAt: true } } },
        }),
        prisma.repository.findMany({ where: { organizationId: orgId } }),
        prisma.commit.findMany({ where: { repository: { organizationId: orgId } } }),
        prisma.pullRequest.findMany({ where: { repository: { organizationId: orgId } } }),
        prisma.pullRequestReview.findMany({
          where: { pullRequest: { repository: { organizationId: orgId } } },
        }),
        prisma.aICodeReview.findMany({ where: { repository: { organizationId: orgId } } }),
        prisma.documentation.findMany({ where: { organizationId: orgId } }),
        prisma.sprintHealth.findMany({ where: { organizationId: orgId } }),
        prisma.integration.findMany({
          where: { organizationId: orgId },
          select: { id: true, type: true, status: true, createdAt: true, updatedAt: true },
        }),
        prisma.auditLog.findMany({
          where: { organizationId: orgId },
          take: 1000,
          orderBy: { createdAt: "desc" },
        }),
      ]);

    await logAudit({
      userId: req.userId,
      organizationId: orgId,
      action: "compliance.data_exported",
      resourceType: "Organization",
      resourceId: orgId,
    });

    res.json({
      exportedAt: new Date().toISOString(),
      organization: org,
      members,
      repositories: repos,
      commits: { count: commits.length, data: commits },
      pullRequests: { count: prs.length, data: prs },
      reviews: { count: reviews.length, data: reviews },
      aiReviews: { count: aiReviews.length, data: aiReviews },
      documentation: { count: docs.length, data: docs },
      sprintHealth: { count: sprints.length, data: sprints },
      integrations,
      auditLogs: { count: auditLogs.length, data: auditLogs },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete all org data (GDPR right to erasure) ───────────────────────────────
exports.deleteOrgData = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { confirm } = req.body;

    if (confirm !== "DELETE_ALL_DATA") {
      return res.status(400).json({
        error: 'Must send { confirm: "DELETE_ALL_DATA" } to proceed',
      });
    }

    // Delete in correct order (respecting foreign keys)
    await prisma.$transaction([
      prisma.aICodeReview.deleteMany({ where: { repository: { organizationId: orgId } } }),
      prisma.pullRequestReview.deleteMany({
        where: { pullRequest: { repository: { organizationId: orgId } } },
      }),
      prisma.pullRequest.deleteMany({ where: { repository: { organizationId: orgId } } }),
      prisma.commit.deleteMany({ where: { repository: { organizationId: orgId } } }),
      prisma.documentation.deleteMany({ where: { organizationId: orgId } }),
      prisma.sprintHealth.deleteMany({ where: { organizationId: orgId } }),
      prisma.usageRecord.deleteMany({ where: { organizationId: orgId } }),
      prisma.apiKey.deleteMany({ where: { organizationId: orgId } }),
      prisma.customReviewRule.deleteMany({ where: { organizationId: orgId } }),
      prisma.repository.deleteMany({ where: { organizationId: orgId } }),
      prisma.integration.deleteMany({ where: { organizationId: orgId } }),
      prisma.auditLog.deleteMany({ where: { organizationId: orgId } }),
    ]);

    await logAudit({
      userId: req.userId,
      organizationId: orgId,
      action: "compliance.data_deleted",
      resourceType: "Organization",
      resourceId: orgId,
    });

    res.json({ success: true, message: "All organization data has been deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get/Update data retention policy ──────────────────────────────────────────
exports.getRetentionPolicy = async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.orgId },
      select: { dataRetentionDays: true },
    });
    res.json({ dataRetentionDays: org?.dataRetentionDays || 365 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRetentionPolicy = async (req, res) => {
  try {
    const { dataRetentionDays } = req.body;
    if (!dataRetentionDays || dataRetentionDays < 30) {
      return res.status(400).json({ error: "Minimum retention period is 30 days" });
    }

    await prisma.organization.update({
      where: { id: req.params.orgId },
      data: { dataRetentionDays },
    });

    await logAudit({
      userId: req.userId,
      organizationId: req.params.orgId,
      action: "compliance.retention_updated",
      metadata: { dataRetentionDays },
    });

    res.json({ dataRetentionDays });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Apply data retention (cleanup old data) ───────────────────────────────────
exports.applyRetention = async (req, res) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.orgId },
    });
    const retentionDays = org?.dataRetentionDays || 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const [deletedCommits, deletedLogs] = await Promise.all([
      prisma.commit.deleteMany({
        where: { repository: { organizationId: req.params.orgId }, committedAt: { lt: cutoff } },
      }),
      prisma.auditLog.deleteMany({
        where: { organizationId: req.params.orgId, createdAt: { lt: cutoff } },
      }),
    ]);

    res.json({
      applied: true,
      retentionDays,
      cutoffDate: cutoff.toISOString(),
      deletedCommits: deletedCommits.count,
      deletedAuditLogs: deletedLogs.count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
