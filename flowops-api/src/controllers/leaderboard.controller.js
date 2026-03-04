const prisma = require("../services/prisma");

/**
 * Feature #9: PR Review Leaderboard & Gamification
 */

const BADGES = {
  FIRST_REVIEW: { name: "First Review", description: "Completed your first code review", icon: "🏅" },
  SPEED_DEMON: { name: "Speed Demon", description: "Reviewed a PR within 1 hour", icon: "⚡" },
  REVIEW_STREAK_5: { name: "5-Day Streak", description: "Reviewed PRs 5 days in a row", icon: "🔥" },
  TOP_REVIEWER: { name: "Top Reviewer", description: "Most reviews this month", icon: "👑" },
  HUNDRED_CLUB: { name: "100 Club", description: "Completed 100 reviews", icon: "💯" },
  MERGE_MASTER: { name: "Merge Master", description: "Had 50 PRs merged", icon: "🔀" },
  DOCS_HERO: { name: "Docs Hero", description: "Generated 10+ documentation sets", icon: "📚" },
  BIG_COMMITTER: { name: "Big Committer", description: "Made 500+ commits", icon: "🏆" },
};

// ── Get leaderboard for an org ────────────────────────────────────────────────
exports.getLeaderboard = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { period = "month" } = req.query;

    // Calculate date range
    const now = new Date();
    let since;
    if (period === "week") {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      since = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "all") {
      since = new Date(0);
    } else {
      since = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get all members
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });

    // Get stats for each member
    const leaderboard = await Promise.all(
      members.map(async (member) => {
        const [reviewCount, commitCount, prCount, mergedPRCount] = await Promise.all([
          prisma.pullRequestReview.count({
            where: {
              reviewerUsername: member.user.username,
              pullRequest: { repository: { organizationId: orgId } },
              submittedAt: { gte: since },
            },
          }),
          prisma.commit.count({
            where: {
              authorUsername: member.user.username,
              repository: { organizationId: orgId },
              committedAt: { gte: since },
            },
          }),
          prisma.pullRequest.count({
            where: {
              authorUsername: member.user.username,
              repository: { organizationId: orgId },
              createdAt: { gte: since },
            },
          }),
          prisma.pullRequest.count({
            where: {
              authorUsername: member.user.username,
              repository: { organizationId: orgId },
              mergedAt: { not: null, gte: since },
            },
          }),
        ]);

        // Calculate score: reviews weighted highest
        const score = reviewCount * 5 + commitCount * 1 + prCount * 3 + mergedPRCount * 2;

        // Compute badges
        const badges = [];
        if (reviewCount > 0) badges.push(BADGES.FIRST_REVIEW);
        if (reviewCount >= 100) badges.push(BADGES.HUNDRED_CLUB);
        if (commitCount >= 500) badges.push(BADGES.BIG_COMMITTER);
        if (mergedPRCount >= 50) badges.push(BADGES.MERGE_MASTER);

        return {
          userId: member.user.id,
          username: member.user.username,
          avatarUrl: member.user.avatarUrl,
          role: member.role,
          stats: { reviews: reviewCount, commits: commitCount, prsOpened: prCount, prsMerged: mergedPRCount },
          score,
          badges,
        };
      })
    );

    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);

    // Add rank and top reviewer badge
    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
      if (idx === 0 && entry.stats.reviews > 0) {
        entry.badges.push(BADGES.TOP_REVIEWER);
      }
    });

    res.json({ period, since: since.toISOString(), leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get individual user stats ─────────────────────────────────────────────────
exports.getUserStats = async (req, res) => {
  try {
    const { orgId, username } = req.params;

    const [totalReviews, totalCommits, totalPRs, totalMerged, totalDocs] = await Promise.all([
      prisma.pullRequestReview.count({
        where: {
          reviewerUsername: username,
          pullRequest: { repository: { organizationId: orgId } },
        },
      }),
      prisma.commit.count({
        where: { authorUsername: username, repository: { organizationId: orgId } },
      }),
      prisma.pullRequest.count({
        where: { authorUsername: username, repository: { organizationId: orgId } },
      }),
      prisma.pullRequest.count({
        where: {
          authorUsername: username,
          repository: { organizationId: orgId },
          mergedAt: { not: null },
        },
      }),
      prisma.documentation.count({ where: { organizationId: orgId } }),
    ]);

    const badges = [];
    if (totalReviews > 0) badges.push(BADGES.FIRST_REVIEW);
    if (totalReviews >= 100) badges.push(BADGES.HUNDRED_CLUB);
    if (totalCommits >= 500) badges.push(BADGES.BIG_COMMITTER);
    if (totalMerged >= 50) badges.push(BADGES.MERGE_MASTER);
    if (totalDocs >= 10) badges.push(BADGES.DOCS_HERO);

    res.json({
      username,
      allTime: {
        reviews: totalReviews,
        commits: totalCommits,
        prsOpened: totalPRs,
        prsMerged: totalMerged,
        score: totalReviews * 5 + totalCommits * 1 + totalPRs * 3 + totalMerged * 2,
      },
      badges,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
