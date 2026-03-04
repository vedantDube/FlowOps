const prisma = require("../services/prisma");
const logger = require("../utils/logger");

const ACHIEVEMENTS = [
  // Commits
  { key: "first_commit", name: "First Blood", description: "Make your first commit", icon: "🎯", category: "commits", threshold: 1 },
  { key: "commits_10", name: "Getting Started", description: "Make 10 commits", icon: "🌱", category: "commits", threshold: 10 },
  { key: "commits_50", name: "Consistent Coder", description: "Make 50 commits", icon: "💻", category: "commits", threshold: 50 },
  { key: "commits_100", name: "Century Club", description: "Make 100 commits", icon: "💯", category: "commits", threshold: 100 },
  { key: "commits_500", name: "Code Machine", description: "Make 500 commits", icon: "⚡", category: "commits", threshold: 500 },
  { key: "commits_1000", name: "Legendary Coder", description: "Make 1000 commits", icon: "🏆", category: "commits", threshold: 1000 },
  // Streak
  { key: "streak_3", name: "Hat Trick", description: "3-day commit streak", icon: "🔥", category: "streak", threshold: 3 },
  { key: "streak_7", name: "Week Warrior", description: "7-day commit streak", icon: "🗓️", category: "streak", threshold: 7 },
  { key: "streak_30", name: "Monthly Master", description: "30-day commit streak", icon: "📅", category: "streak", threshold: 30 },
  { key: "streak_100", name: "Unstoppable", description: "100-day commit streak", icon: "🚀", category: "streak", threshold: 100 },
  // Reviews
  { key: "reviews_5", name: "Reviewer Rookie", description: "Get 5 AI reviews", icon: "🔍", category: "reviews", threshold: 5 },
  { key: "reviews_25", name: "Quality Guardian", description: "Get 25 AI reviews", icon: "🛡️", category: "reviews", threshold: 25 },
  { key: "reviews_100", name: "Review Master", description: "Get 100 AI reviews", icon: "👑", category: "reviews", threshold: 100 },
  // Docs
  { key: "docs_1", name: "Documenter", description: "Generate your first doc", icon: "📝", category: "docs", threshold: 1 },
  { key: "docs_10", name: "Knowledge Builder", description: "Generate 10 docs", icon: "📚", category: "docs", threshold: 10 },
  // Social
  { key: "profile_complete", name: "Identity", description: "Complete your developer profile", icon: "🪪", category: "social", threshold: 1 },
  { key: "snippets_5", name: "Snippet Collector", description: "Save 5 code snippets", icon: "✂️", category: "social", threshold: 5 },
  { key: "snippets_25", name: "Code Librarian", description: "Save 25 code snippets", icon: "📖", category: "social", threshold: 25 },
  { key: "tasks_10", name: "Task Crusher", description: "Complete 10 tasks", icon: "✅", category: "social", threshold: 10 },
  { key: "stars_10", name: "Star Gazer", description: "Have 10+ total stars on repos", icon: "⭐", category: "social", threshold: 10 },
];

// ── Seed achievements (run once)
exports.seedAchievements = async (req, res) => {
  try {
    let created = 0;
    for (const a of ACHIEVEMENTS) {
      await prisma.achievement.upsert({
        where: { key: a.key },
        update: {},
        create: a,
      });
      created++;
    }
    res.json({ message: `Seeded ${created} achievements` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── List all achievements with user progress
exports.listAchievements = async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: [{ category: "asc" }, { threshold: "asc" }],
      include: {
        users: {
          where: { userId: req.userId },
        },
      },
    });

    const result = achievements.map((a) => {
      const userProgress = a.users[0];
      return {
        id: a.id,
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        threshold: a.threshold,
        progress: userProgress?.progress || 0,
        earned: !!userProgress?.earnedAt,
        earnedAt: userProgress?.earnedAt,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Check & update user achievements based on activity
exports.checkAchievements = async (req, res) => {
  try {
    const userId = req.userId;
    const { accessToken } = req.user;

    // Gather stats
    const { getUserRepos, getRecentCommits } = require("../services/github.service");
    const repos = await getUserRepos(accessToken);
    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);

    // Count commits from top repos
    let totalCommits = 0;
    for (const repo of repos.slice(0, 5)) {
      try {
        const [owner, name] = repo.full_name.split("/");
        const commits = await getRecentCommits(accessToken, owner, name, 100);
        totalCommits += commits.length;
      } catch { /* skip */ }
    }

    // Count snippets & tasks
    const snippetCount = await prisma.codeSnippet.count({ where: { userId } });
    const completedTasks = await prisma.personalTask.count({ where: { userId, status: "done" } });

    // Check profile completeness
    const profile = await prisma.developerProfile.findUnique({ where: { userId } });
    const profileComplete = profile && profile.bio && profile.skills ? 1 : 0;

    // Map metrics to achievement categories
    const metrics = {
      first_commit: totalCommits, commits_10: totalCommits, commits_50: totalCommits,
      commits_100: totalCommits, commits_500: totalCommits, commits_1000: totalCommits,
      snippets_5: snippetCount, snippets_25: snippetCount,
      tasks_10: completedTasks,
      profile_complete: profileComplete,
      stars_10: totalStars,
    };

    const achievements = await prisma.achievement.findMany();
    const newlyEarned = [];

    for (const a of achievements) {
      const progress = metrics[a.key] || 0;
      if (progress === undefined) continue;

      const existing = await prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId: a.id } },
      });

      if (existing?.earnedAt) continue; // Already earned

      const earned = progress >= a.threshold;
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: a.id } },
        update: { progress, earnedAt: earned ? new Date() : null },
        create: { userId, achievementId: a.id, progress, earnedAt: earned ? new Date() : null },
      });

      if (earned && !existing?.earnedAt) {
        newlyEarned.push({ name: a.name, icon: a.icon, description: a.description });
      }
    }

    res.json({ checked: achievements.length, newlyEarned });
  } catch (err) {
    logger.error({ err }, "Check achievements error");
    res.status(500).json({ error: err.message });
  }
};
