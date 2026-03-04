const prisma = require("../services/prisma");

/**
 * Feature #11: Public Status Page / Engineering Report
 * No auth required — generates a shareable report for an org
 */

// ── Get public engineering report ──────────────────────────────────────────────
exports.getPublicReport = async (req, res) => {
  try {
    const { slug } = req.params;

    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { subscription: true },
    });

    if (!org) return res.status(404).json({ error: "Organization not found" });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Gather public-safe metrics
    const [
      repoCount,
      totalCommits7d,
      totalCommits30d,
      totalPRs,
      mergedPRs7d,
      openPRs,
      aiReviewCount,
      latestSprint,
      closedPRs,
    ] = await Promise.all([
      prisma.repository.count({ where: { organizationId: org.id } }),
      prisma.commit.count({
        where: { repository: { organizationId: org.id }, committedAt: { gte: sevenDaysAgo } },
      }),
      prisma.commit.count({
        where: { repository: { organizationId: org.id }, committedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.pullRequest.count({ where: { repository: { organizationId: org.id } } }),
      prisma.pullRequest.count({
        where: { repository: { organizationId: org.id }, mergedAt: { gte: sevenDaysAgo } },
      }),
      prisma.pullRequest.count({
        where: { repository: { organizationId: org.id }, state: "open" },
      }),
      prisma.aICodeReview.count({
        where: { repository: { organizationId: org.id }, status: "completed" },
      }),
      prisma.sprintHealth.findFirst({
        where: { organizationId: org.id },
        orderBy: { generatedAt: "desc" },
      }),
      prisma.pullRequest.findMany({
        where: { repository: { organizationId: org.id }, closedAt: { not: null } },
        select: { openedAt: true, closedAt: true },
        take: 100,
        orderBy: { closedAt: "desc" },
      }),
    ]);

    // Calculate avg cycle time
    const avgCycleTimeHours = closedPRs.length > 0
      ? closedPRs.reduce((s, pr) => s + (new Date(pr.closedAt) - new Date(pr.openedAt)) / 3_600_000, 0) / closedPRs.length
      : 0;

    // Top contributors (last 30 days)
    const contributors = await prisma.commit.groupBy({
      by: ["author"],
      where: { repository: { organizationId: org.id }, committedAt: { gte: thirtyDaysAgo } },
      _count: { sha: true },
      orderBy: { _count: { sha: "desc" } },
      take: 5,
    });

    res.json({
      org: {
        name: org.companyName || org.name,
        slug: org.slug,
        avatarUrl: org.avatarUrl,
        customLogo: org.customLogo,
        primaryColor: org.primaryColor,
      },
      generatedAt: new Date().toISOString(),
      metrics: {
        repos: repoCount,
        commits7d: totalCommits7d,
        commits30d: totalCommits30d,
        totalPRs,
        mergedPRs7d,
        openPRs,
        avgCycleTimeHours: +avgCycleTimeHours.toFixed(1),
        aiReviewsCompleted: aiReviewCount,
        securityIssuesThisSprint: 0,
      },
      sprintHealth: latestSprint
        ? {
            healthScore: latestSprint.healthScore,
            deliveryPredictability: latestSprint.deliveryPredictability,
            burnoutRisk: latestSprint.burnoutRisk,
          }
        : null,
      topContributors: contributors.map((c) => ({
        author: c.author,
        commits: c._count.sha,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
