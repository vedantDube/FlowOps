const prisma = require("../services/prisma");

// 1. Average PR Cycle Time
exports.getPRCycleTime = async (req, res) => {
  const prs = await prisma.pullRequest.findMany({
    where: { closedAt: { not: null } },
  });

  if (!prs.length) return res.json({ averageHours: 0 });

  const durations = prs.map(
    (pr) => (new Date(pr.closedAt) - new Date(pr.openedAt)) / (1000 * 60 * 60)
  );

  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

  res.json({ averageHours: avg.toFixed(2) });
};

// 2. Review Latency
exports.getReviewLatency = async (req, res) => {
  const reviews = await prisma.pullRequestReview.findMany({
    include: { pullRequest: true },
  });

  if (!reviews.length) return res.json({ averageHours: 0 });

  const delays = reviews.map(
    (r) =>
      (new Date(r.reviewedAt) - new Date(r.pullRequest.openedAt)) /
      (1000 * 60 * 60)
  );

  const avg = delays.reduce((a, b) => a + b, 0) / delays.length;

  res.json({ averageHours: avg.toFixed(2) });
};

// 3. Commits per day (last 7 days)
exports.getCommitActivity = async (req, res) => {
  const days = 7;
  const data = [];

  for (let i = days - 1; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const count = await prisma.commit.count({
      where: {
        committedAt: {
          gte: start,
          lte: end,
        },
      },
    });

    data.push({
      day: start.toLocaleDateString("en-US", { weekday: "short" }),
      commits: count,
    });
  }

  res.json(data);
};
