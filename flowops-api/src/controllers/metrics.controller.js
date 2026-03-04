const prisma = require("../services/prisma");

// ── PR Cycle Time ──────────────────────────────────────────────────────────────
exports.getPRCycleTime = async (req, res) => {
  try {
    const { orgId, repoId, days: daysParam } = req.query;
    const daysNum = parseInt(daysParam, 10);

    const buildWhere = (dateFilter) => {
      const w = { closedAt: { not: null } };
      if (repoId) w.repositoryId = repoId;
      if (orgId) w.repository = { organizationId: orgId };
      if (dateFilter) w.closedAt = { not: null, ...dateFilter };
      return w;
    };

    // Current period
    let currentDateFilter = null;
    if (daysNum > 0) {
      const since = new Date();
      since.setDate(since.getDate() - daysNum);
      since.setHours(0, 0, 0, 0);
      currentDateFilter = { gte: since };
    }

    const prs = await prisma.pullRequest.findMany({
      where: buildWhere(currentDateFilter),
    });
    if (!prs.length)
      return res.json({ averageHours: 0, total: 0, trend: null });

    const durations = prs.map(
      (pr) => (new Date(pr.closedAt) - new Date(pr.openedAt)) / 3_600_000,
    );
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p75 = percentile(durations, 75);

    // Previous period trend
    let trend = null;
    if (daysNum > 0) {
      const prevEnd = new Date();
      prevEnd.setDate(prevEnd.getDate() - daysNum);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - daysNum);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setHours(0, 0, 0, 0);

      const prevPrs = await prisma.pullRequest.findMany({
        where: buildWhere({ gte: prevStart, lt: prevEnd }),
      });
      if (prevPrs.length) {
        const prevDurations = prevPrs.map(
          (pr) => (new Date(pr.closedAt) - new Date(pr.openedAt)) / 3_600_000,
        );
        const prevAvg =
          prevDurations.reduce((a, b) => a + b, 0) / prevDurations.length;
        if (prevAvg > 0)
          trend = +(((avg - prevAvg) / prevAvg) * 100).toFixed(1);
      }
    }

    res.json({
      averageHours: +avg.toFixed(2),
      p75Hours: +p75.toFixed(2),
      total: prs.length,
      trend,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Review Latency ─────────────────────────────────────────────────────────────
exports.getReviewLatency = async (req, res) => {
  try {
    const { orgId, repoId, days: daysParam } = req.query;
    const daysNum = parseInt(daysParam, 10);

    const buildWhere = (dateFilter) => {
      const w = {};
      if (repoId) w.pullRequest = { repositoryId: repoId };
      if (orgId)
        w.pullRequest = {
          ...(w.pullRequest || {}),
          repository: { organizationId: orgId },
        };
      if (dateFilter) w.reviewedAt = dateFilter;
      return w;
    };

    // Current period
    let currentDateFilter = null;
    if (daysNum > 0) {
      const since = new Date();
      since.setDate(since.getDate() - daysNum);
      since.setHours(0, 0, 0, 0);
      currentDateFilter = { gte: since };
    }

    const reviews = await prisma.pullRequestReview.findMany({
      where: buildWhere(currentDateFilter),
      include: { pullRequest: true },
    });

    if (!reviews.length)
      return res.json({ averageHours: 0, total: 0, trend: null });

    const delays = reviews.map(
      (r) =>
        (new Date(r.reviewedAt) - new Date(r.pullRequest.openedAt)) / 3_600_000,
    );
    const avg = delays.reduce((a, b) => a + b, 0) / delays.length;

    // Previous period trend
    let trend = null;
    if (daysNum > 0) {
      const prevEnd = new Date();
      prevEnd.setDate(prevEnd.getDate() - daysNum);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - daysNum);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setHours(0, 0, 0, 0);

      const prevReviews = await prisma.pullRequestReview.findMany({
        where: buildWhere({ gte: prevStart, lt: prevEnd }),
        include: { pullRequest: true },
      });
      if (prevReviews.length) {
        const prevDelays = prevReviews.map(
          (r) =>
            (new Date(r.reviewedAt) - new Date(r.pullRequest.openedAt)) /
            3_600_000,
        );
        const prevAvg =
          prevDelays.reduce((a, b) => a + b, 0) / prevDelays.length;
        if (prevAvg > 0)
          trend = +(((avg - prevAvg) / prevAvg) * 100).toFixed(1);
      }
    }

    res.json({ averageHours: +avg.toFixed(2), total: reviews.length, trend });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Commit Activity (last N days) ──────────────────────────────────────────────
exports.getCommitActivity = async (req, res) => {
  try {
    const {
      orgId,
      repoId,
      days: daysParam = 7,
      offset: offsetParam = 0,
    } = req.query;
    let days = parseInt(daysParam, 10) || 7;
    const offset = parseInt(offsetParam, 10) || 0; // shift window back by N days

    // days=0 means "all time" — find the oldest commit
    if (days === 0) {
      const commitWhere = {};
      if (repoId) commitWhere.repositoryId = repoId;
      if (orgId) commitWhere.repository = { organizationId: orgId };
      const oldest = await prisma.commit.findFirst({
        where: commitWhere,
        orderBy: { committedAt: "asc" },
        select: { committedAt: true },
      });
      if (oldest) {
        days =
          Math.ceil(
            (Date.now() - new Date(oldest.committedAt).getTime()) / 86_400_000,
          ) + 1;
      } else {
        days = 7; // fallback
      }
    } else {
      days = Math.min(days, 365);
    }

    // Build date range for the entire window
    const windowEnd = new Date();
    windowEnd.setDate(windowEnd.getDate() - offset);
    windowEnd.setHours(23, 59, 59, 999);

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - (days - 1) - offset);
    windowStart.setHours(0, 0, 0, 0);

    // Single aggregation query instead of N+1 individual count queries
    const commitWhere = { committedAt: { gte: windowStart, lte: windowEnd } };
    if (repoId) commitWhere.repositoryId = repoId;
    if (orgId) commitWhere.repository = { organizationId: orgId };

    const commits = await prisma.commit.findMany({
      where: commitWhere,
      select: { committedAt: true },
    });

    // Group by date in memory
    const countsByDate = {};
    for (const c of commits) {
      const dateKey = new Date(c.committedAt).toISOString().slice(0, 10);
      countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
    }

    // Build output array for every day in the range
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i - offset);
      day.setHours(0, 0, 0, 0);
      const dateStr = day.toISOString().slice(0, 10);
      data.push({
        day: day.toLocaleDateString("en-US", { weekday: "short" }),
        date: dateStr,
        commits: countsByDate[dateStr] || 0,
      });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Code Churn ─────────────────────────────────────────────────────────────────
exports.getCodeChurn = async (req, res) => {
  try {
    const { orgId, repoId, days: daysParam } = req.query;
    const where = {};
    if (repoId) where.repositoryId = repoId;
    if (orgId) where.repository = { organizationId: orgId };

    // Apply date filter if days is provided and > 0
    const daysNum = parseInt(daysParam, 10);
    if (daysNum > 0) {
      const since = new Date();
      since.setDate(since.getDate() - daysNum);
      since.setHours(0, 0, 0, 0);
      where.committedAt = { gte: since };
    }

    const commits = await prisma.commit.findMany({
      where,
      orderBy: { committedAt: "asc" },
      select: { committedAt: true, additions: true, deletions: true },
    });

    const grouped = {};
    for (const c of commits) {
      const day = new Date(c.committedAt).toISOString().slice(0, 10);
      if (!grouped[day]) grouped[day] = { day, additions: 0, deletions: 0 };
      grouped[day].additions += c.additions;
      grouped[day].deletions += c.deletions;
    }
    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Top Contributors ───────────────────────────────────────────────────────────
exports.getTopContributors = async (req, res) => {
  try {
    const { orgId, repoId, limit = 10, days: daysParam } = req.query;
    const where = {};
    if (repoId) where.repositoryId = repoId;
    if (orgId) where.repository = { organizationId: orgId };

    const daysNum = parseInt(daysParam, 10);
    if (daysNum > 0) {
      const since = new Date();
      since.setDate(since.getDate() - daysNum);
      since.setHours(0, 0, 0, 0);
      where.committedAt = { gte: since };
    }

    const commits = await prisma.commit.groupBy({
      by: ["author"],
      where,
      _count: { sha: true },
      orderBy: { _count: { sha: "desc" } },
      take: parseInt(limit, 10),
    });

    res.json(commits.map((c) => ({ author: c.author, commits: c._count.sha })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Helper ─────────────────────────────────────────────────────────────────────
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] || 0;
}
