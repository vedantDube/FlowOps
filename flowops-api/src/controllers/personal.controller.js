const prisma = require("../services/prisma");
const { getUserRepos, getRecentCommits, getRepoPullRequests, getRepoContributors } = require("../services/github.service");
const logger = require("../utils/logger");

// ── Personal Dashboard: repos, recent activity from GitHub
exports.getPersonalDashboard = async (req, res) => {
  try {
    const { accessToken, username } = req.user;
    const repos = await getUserRepos(accessToken);

    // Get top 5 repos by recent push
    const topRepos = repos
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        isPrivate: r.private,
        updatedAt: r.pushed_at,
        defaultBranch: r.default_branch,
        openIssues: r.open_issues_count,
        url: r.html_url,
      }));

    // Quick stats
    const totalRepos = repos.length;
    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
    const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);
    const languages = [...new Set(repos.map((r) => r.language).filter(Boolean))];

    // Recent commits from top 3 repos
    let recentCommits = [];
    for (const repo of topRepos.slice(0, 3)) {
      try {
        const [owner, name] = repo.fullName.split("/");
        const commits = await getRecentCommits(accessToken, owner, name, 5);
        recentCommits.push(
          ...commits.map((c) => ({
            sha: c.sha.slice(0, 7),
            message: c.commit.message.split("\n")[0],
            repo: repo.name,
            date: c.commit.committer?.date,
            author: c.commit.author?.name,
          }))
        );
      } catch {
        /* repo might be empty */
      }
    }
    recentCommits.sort((a, b) => new Date(b.date) - new Date(a.date));
    recentCommits = recentCommits.slice(0, 15);

    // Achievement progress
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: req.userId },
      include: { achievement: true },
    });
    const earned = achievements.filter((a) => a.earnedAt).length;

    // Task summary
    const tasks = await prisma.personalTask.groupBy({
      by: ["status"],
      where: { userId: req.userId },
      _count: true,
    });

    res.json({
      username,
      stats: { totalRepos, totalStars, totalForks, languages: languages.slice(0, 8), achievementsEarned: earned },
      topRepos,
      recentCommits,
      taskSummary: tasks.reduce((acc, t) => ({ ...acc, [t.status]: t._count }), {}),
    });
  } catch (err) {
    logger.error({ err }, "Personal dashboard error");
    res.status(500).json({ error: err.message });
  }
};

// ── Personal Metrics: code velocity, streaks
exports.getPersonalMetrics = async (req, res) => {
  try {
    const { accessToken } = req.user;
    const { days = 30 } = req.query;
    const daysNum = parseInt(days, 10) || 30;

    const repos = await getUserRepos(accessToken);
    const topRepos = repos
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 5);

    // Gather commit data for heatmap/metrics
    const since = new Date();
    since.setDate(since.getDate() - daysNum);
    const sinceISO = since.toISOString();

    let allCommits = [];
    let totalPRs = 0;
    let mergedPRs = 0;

    for (const repo of topRepos) {
      const [owner, name] = repo.full_name.split("/");
      try {
        const commits = await getRecentCommits(accessToken, owner, name, 100);
        const filtered = commits.filter(
          (c) => new Date(c.commit.committer?.date) >= since
        );
        allCommits.push(
          ...filtered.map((c) => ({
            date: c.commit.committer?.date,
            repo: repo.name,
            additions: c.stats?.additions || 0,
            deletions: c.stats?.deletions || 0,
          }))
        );

        const prs = await getRepoPullRequests(accessToken, owner, name, "all", 50);
        const recentPRs = prs.filter(
          (pr) => new Date(pr.created_at) >= since
        );
        totalPRs += recentPRs.length;
        mergedPRs += recentPRs.filter((pr) => pr.merged_at).length;
      } catch {
        /* skip */
      }
    }

    // Daily commit counts for chart
    const dailyCounts = {};
    for (let i = daysNum - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyCounts[key] = 0;
    }
    for (const c of allCommits) {
      const key = new Date(c.date).toISOString().slice(0, 10);
      if (dailyCounts[key] !== undefined) dailyCounts[key]++;
    }

    const commitActivity = Object.entries(dailyCounts).map(([date, commits]) => ({
      date,
      day: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
      commits,
    }));

    // Streak calculation
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const dates = Object.entries(dailyCounts).reverse();
    for (const [, count] of dates) {
      if (count > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        if (currentStreak === 0) currentStreak = tempStreak;
        tempStreak = 0;
      }
    }
    if (currentStreak === 0) currentStreak = tempStreak;

    // Language breakdown
    const langMap = {};
    repos.forEach((r) => {
      if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1;
    });
    const languageBreakdown = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count, pct: +((count / repos.length) * 100).toFixed(1) }));

    res.json({
      totalCommits: allCommits.length,
      totalPRs,
      mergedPRs,
      currentStreak,
      longestStreak,
      dailyAvg: +(allCommits.length / daysNum).toFixed(1),
      commitActivity,
      languageBreakdown,
      activeRepos: topRepos.length,
    });
  } catch (err) {
    logger.error({ err }, "Personal metrics error");
    res.status(500).json({ error: err.message });
  }
};

// ── Contribution Heatmap (365 days)
exports.getContributionHeatmap = async (req, res) => {
  try {
    const { accessToken } = req.user;
    const repos = await getUserRepos(accessToken);
    const topRepos = repos
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 8);

    const since = new Date();
    since.setDate(since.getDate() - 365);

    const heatmap = {};
    for (let i = 365; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      heatmap[d.toISOString().slice(0, 10)] = 0;
    }

    for (const repo of topRepos) {
      const [owner, name] = repo.full_name.split("/");
      try {
        const commits = await getRecentCommits(accessToken, owner, name, 100);
        for (const c of commits) {
          const key = new Date(c.commit.committer?.date).toISOString().slice(0, 10);
          if (heatmap[key] !== undefined) heatmap[key]++;
        }
      } catch {
        /* skip */
      }
    }

    const data = Object.entries(heatmap).map(([date, count]) => ({ date, count }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Update preferred mode
exports.setMode = async (req, res) => {
  try {
    const { mode } = req.body;
    if (!["personal", "org"].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode. Use 'personal' or 'org'" });
    }
    await prisma.user.update({
      where: { id: req.userId },
      data: { preferredMode: mode },
    });
    res.json({ mode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get user's repos for personal features
exports.getPersonalRepos = async (req, res) => {
  try {
    const { accessToken } = req.user;
    const repos = await getUserRepos(accessToken);
    const mapped = repos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      isPrivate: r.private,
      updatedAt: r.pushed_at,
      defaultBranch: r.default_branch,
      url: r.html_url,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
