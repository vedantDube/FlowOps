const prisma = require("../services/prisma");
const { computePRFlow, computeWorkPatterns } = require("../utils/metrics-math");

/**
 * Public, read-only showcase of the seeded "FlowOps Demo" org — powers the
 * no-login /demo page so anyone can see FlowOps working without an account.
 * Serves only the org with the fixed demo slug; returns 404 if it hasn't
 * been seeded (npm run db:seed:demo). Response is cached in memory since
 * demo data only changes on re-seed.
 */

const DEMO_SLUG = "flowops-demo";
const CACHE_TTL_MS = 10 * 60 * 1000;
let cache = { at: 0, payload: null };

exports.getShowcase = async (req, res) => {
  try {
    if (cache.payload && Date.now() - cache.at < CACHE_TTL_MS) {
      return res.json(cache.payload);
    }

    const org = await prisma.organization.findUnique({ where: { slug: DEMO_SLUG } });
    if (!org) {
      return res.status(404).json({ error: "Demo org not seeded" });
    }

    const days = 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    const repoScope = { repository: { organizationId: org.id } };

    const [flowPRs, commits, closedPRs, reviews, deployments, incidentCount, resolvedIncidents, sprint, aiReviews] =
      await Promise.all([
        prisma.pullRequest.findMany({
          where: { ...repoScope, openedAt: { gte: since } },
          select: {
            state: true, openedAt: true, closedAt: true, mergedAt: true,
            reviews: { select: { state: true, reviewedAt: true }, orderBy: { reviewedAt: "asc" } },
          },
        }),
        prisma.commit.findMany({
          where: { ...repoScope, committedAt: { gte: since } },
          select: { author: true, committedAt: true },
        }),
        prisma.pullRequest.findMany({
          where: { ...repoScope, closedAt: { gte: since } },
          select: { openedAt: true, closedAt: true },
        }),
        prisma.pullRequestReview.findMany({
          where: { pullRequest: repoScope, reviewedAt: { gte: since } },
          select: { reviewedAt: true, pullRequest: { select: { openedAt: true } } },
        }),
        prisma.deployment.findMany({
          where: { ...repoScope, kind: "deployment", status: "success", deployedAt: { gte: since } },
          select: { deployedAt: true },
        }),
        prisma.incident.count({
          where: { organizationId: org.id, deploymentId: { not: null }, detectedAt: { gte: since } },
        }),
        prisma.incident.findMany({
          where: { organizationId: org.id, resolvedAt: { not: null }, detectedAt: { gte: since } },
          select: { detectedAt: true, resolvedAt: true },
        }),
        prisma.sprintHealth.findFirst({
          where: { organizationId: org.id },
          orderBy: { generatedAt: "desc" },
        }),
        prisma.aICodeReview.findMany({
          where: { ...repoScope, status: "completed" },
          select: {
            summary: true, overallScore: true, createdAt: true,
            pullRequest: { select: { title: true, number: true, author: true } },
            repository: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
      ]);

    const hours = (a, b) => (new Date(b) - new Date(a)) / 3_600_000;
    const avg = (arr) =>
      arr.length ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : 0;

    // Daily commit series for the sparkline/area chart
    const countsByDate = {};
    for (const c of commits) {
      const key = new Date(c.committedAt).toISOString().slice(0, 10);
      countsByDate[key] = (countsByDate[key] || 0) + 1;
    }
    const commitSeries = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      commitSeries.push({
        day: day.toLocaleDateString("en-US", { weekday: "short" }),
        date: key,
        commits: countsByDate[key] || 0,
      });
    }

    // Top contributors
    const byAuthor = {};
    for (const c of commits) byAuthor[c.author] = (byAuthor[c.author] || 0) + 1;
    const contributors = Object.entries(byAuthor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([author, count]) => ({ author, commits: count }));

    const payload = {
      org: { name: org.name, slug: org.slug },
      windowDays: days,
      generatedAt: new Date().toISOString(),
      metrics: {
        cycleTimeAvgHours: avg(closedPRs.map((pr) => hours(pr.openedAt, pr.closedAt))),
        reviewLatencyAvgHours: avg(reviews.map((r) => hours(r.pullRequest.openedAt, r.reviewedAt))),
        totalCommits: commits.length,
        deploysPerDay: +(deployments.length / days).toFixed(2),
        deployTotal: deployments.length,
        changeFailureRatePct: deployments.length
          ? +((incidentCount / deployments.length) * 100).toFixed(1)
          : 0,
        mttrHours: avg(resolvedIncidents.map((i) => hours(i.detectedAt, i.resolvedAt))),
      },
      commitSeries,
      contributors,
      prFlow: computePRFlow(flowPRs),
      workPatterns: { windowDays: days, ...computeWorkPatterns(commits) },
      sprintHealth: sprint
        ? {
            sprintName: sprint.sprintName,
            healthScore: sprint.healthScore,
            deliveryPredictability: sprint.deliveryPredictability,
            burnoutRisk: sprint.burnoutRisk,
            insights: sprint.insights,
          }
        : null,
      aiReviews: aiReviews.map((r) => ({
        summary: r.summary,
        score: r.overallScore,
        prTitle: r.pullRequest?.title,
        prNumber: r.pullRequest?.number,
        author: r.pullRequest?.author,
        repo: r.repository?.name,
      })),
    };

    cache = { at: Date.now(), payload };
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
