const prisma = require("../services/prisma");
const { generateSprintInsights } = require("../services/gemini");
const { logAudit } = require("../middleware/audit.middleware");
const {
  registerWebhook,
  deleteWebhook,
  getRecentCommits,
  getRepoPullRequests,
  getRepoContributors,
  getUserProfile,
} = require("../services/github.service");

// ── List org members ───────────────────────────────────────────────────────────
exports.listMembers = async (req, res) => {
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: req.params.orgId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Invite / add member ────────────────────────────────────────────────────────
exports.addMember = async (req, res) => {
  try {
    const { userId, role = "member" } = req.body;
    const member = await prisma.organizationMember.create({
      data: { userId, organizationId: req.params.orgId, role },
      include: { user: true },
    });
    await logAudit({
      userId: req.userId,
      organizationId: req.params.orgId,
      action: "member.added",
      resourceType: "User",
      resourceId: userId,
    });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Update member role ─────────────────────────────────────────────────────────
exports.updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    const member = await prisma.organizationMember.update({
      where: {
        userId_organizationId: {
          userId: req.params.userId,
          organizationId: req.params.orgId,
        },
      },
      data: { role },
    });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Connect a GitHub repository to the org ────────────────────────────────────
exports.connectRepo = async (req, res) => {
  try {
    const {
      name,
      fullName,
      githubRepoId,
      defaultBranch,
      description,
      isPrivate,
      syncHistory,
    } = req.body;
    const repo = await prisma.repository.upsert({
      where: { githubRepoId: githubRepoId.toString() },
      update: {
        name,
        fullName,
        defaultBranch,
        description,
        organizationId: req.params.orgId,
      },
      create: {
        name,
        fullName,
        githubRepoId: githubRepoId.toString(),
        defaultBranch: defaultBranch || "main",
        description,
        isPrivate: isPrivate || false,
        organizationId: req.params.orgId,
      },
    });

    // ── Register GitHub webhook so we receive push/PR events ──────────────
    const accessToken = req.user.accessToken;
    const [owner, repoName] = fullName.split("/");
    const appUrl = process.env.APP_URL;

    if (appUrl && accessToken) {
      try {
        const webhookUrl = `${appUrl}/webhooks/github`;
        const hook = await registerWebhook(accessToken, owner, repoName, webhookUrl);
        await prisma.repository.update({
          where: { id: repo.id },
          data: { webhookId: hook.id },
        });
        console.log(`🪝 Webhook registered for ${fullName}`);
      } catch (hookErr) {
        // Hook may already exist (422) — that's fine
        console.warn(`⚠️ Webhook registration for ${fullName}:`, hookErr.response?.data?.errors?.[0]?.message || hookErr.message);
      }
    }

    // ── Sync recent commits & PRs so dashboard isn't empty ────────────────
    if (accessToken && syncHistory) {
      try {
        const branch = defaultBranch || "main";

        // Fetch ALL commits (paginated) and recent PRs
        let allGhCommits = [];
        let page = 1;
        while (true) {
          const batch = await getRecentCommits(
            accessToken,
            owner,
            repoName,
            100,
            page,
          );
          allGhCommits = allGhCommits.concat(batch);
          if (batch.length < 100) break;
          page++;
        }

        let allGhPRs = [];
        page = 1;
        while (true) {
          const batch = await getRepoPullRequests(
            accessToken,
            owner,
            repoName,
            "all",
            100,
            page,
          );
          allGhPRs = allGhPRs.concat(batch);
          if (batch.length < 100) break;
          page++;
        }

        // Store commits
        for (const c of allGhCommits) {
          await prisma.commit.upsert({
            where: { sha: c.sha },
            update: {},
            create: {
              sha: c.sha,
              message: c.commit.message,
              author: c.commit.author.name,
              authorEmail: c.commit.author.email || null,
              additions: c.stats?.additions || 0,
              deletions: c.stats?.deletions || 0,
              filesChanged: c.files?.length || 0,
              committedAt: new Date(c.commit.author.date),
              repositoryId: repo.id,
            },
          });
        }

        // Store PRs
        for (const pr of allGhPRs) {
          await prisma.pullRequest.upsert({
            where: {
              number_repositoryId: { number: pr.number, repositoryId: repo.id },
            },
            update: {
              state: pr.merged_at ? "merged" : pr.state,
              closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
              mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
            },
            create: {
              number: pr.number,
              title: pr.title,
              body: pr.body || null,
              state: pr.merged_at ? "merged" : pr.state,
              author: pr.user.login,
              headBranch: pr.head.ref,
              baseBranch: pr.base.ref,
              additions: pr.additions || 0,
              deletions: pr.deletions || 0,
              changedFiles: pr.changed_files || 0,
              openedAt: new Date(pr.created_at),
              closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
              mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
              repositoryId: repo.id,
            },
          });
        }

        console.log(`📊 Synced ${allGhCommits.length} commits & ${allGhPRs.length} PRs for ${fullName}`);
      } catch (syncErr) {
        console.warn(`⚠️ Initial sync for ${fullName}:`, syncErr.message);
      }
    }

    await logAudit({
      userId: req.userId,
      organizationId: req.params.orgId,
      action: "repo.connected",
      resourceType: "Repository",
      resourceId: repo.id,
      metadata: { fullName },
    });
    res.json(repo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── List org repositories ─────────────────────────────────────────────────────
exports.listRepos = async (req, res) => {
  try {
    const repos = await prisma.repository.findMany({
      where: { organizationId: req.params.orgId },
      include: {
        _count: { select: { commits: true, pullRequests: true } },
      },
    });
    res.json(repos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Disconnect a repository from the org ──────────────────────────────────────
exports.disconnectRepo = async (req, res) => {
  try {
    const repo = await prisma.repository.findUnique({
      where: { id: req.params.repoId },
    });
    if (!repo || repo.organizationId !== req.params.orgId) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // ── Remove webhook from GitHub ────────────────────────────────────────
    if (repo.webhookId && req.user.accessToken) {
      const [owner, repoName] = repo.fullName.split("/");
      try {
        await deleteWebhook(req.user.accessToken, owner, repoName, repo.webhookId);
        console.log(`🗑️ Webhook removed for ${repo.fullName}`);
      } catch (hookErr) {
        console.warn(`⚠️ Could not remove webhook for ${repo.fullName}:`, hookErr.message);
      }
    }

    await prisma.repository.delete({ where: { id: req.params.repoId } });

    // ── If no repos remain, clear all org-level analytics data ──────────
    const remainingRepos = await prisma.repository.count({
      where: { organizationId: req.params.orgId },
    });
    if (remainingRepos === 0) {
      await Promise.all([
        prisma.sprintHealth.deleteMany({
          where: { organizationId: req.params.orgId },
        }),
        prisma.documentation.deleteMany({
          where: { organizationId: req.params.orgId },
        }),
      ]);
      console.log(`🧹 Cleared all analytics data for org ${req.params.orgId} (no repos left)`);
    }

    await logAudit({
      userId: req.userId,
      organizationId: req.params.orgId,
      action: "repo.disconnected",
      resourceType: "Repository",
      resourceId: req.params.repoId,
      metadata: { fullName: repo.fullName },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Sprint health score generation ────────────────────────────────────────────
exports.generateSprintHealth = async (req, res) => {
  try {
    const { sprintName } = req.body;
    const orgId = req.params.orgId;

    // Gather metrics
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [prs, reviews, commits] = await Promise.all([
      prisma.pullRequest.findMany({
        where: { repository: { organizationId: orgId } },
      }),
      prisma.pullRequestReview.findMany({
        where: { pullRequest: { repository: { organizationId: orgId } } },
        include: { pullRequest: true },
      }),
      prisma.commit.count({
        where: {
          repository: { organizationId: orgId },
          committedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    const closedPRs = prs.filter((p) => p.closedAt);
    const prCycleAvgHours = closedPRs.length
      ? closedPRs.reduce(
          (s, p) =>
            s + (new Date(p.closedAt) - new Date(p.openedAt)) / 3_600_000,
          0,
        ) / closedPRs.length
      : 0;

    const reviewLatencyAvgHours = reviews.length
      ? reviews.reduce(
          (s, r) =>
            s +
            (new Date(r.reviewedAt) - new Date(r.pullRequest.openedAt)) /
              3_600_000,
          0,
        ) / reviews.length
      : 0;

    const commitFrequency = commits / 7;
    const openPRs = prs.filter((p) => p.state === "open").length;
    const mergedPRs = prs.filter((p) => p.mergedAt).length;

    // Calculate health score (0-100)
    let score = 100;
    if (prCycleAvgHours > 48) score -= 20;
    else if (prCycleAvgHours > 24) score -= 10;
    if (reviewLatencyAvgHours > 24) score -= 20;
    else if (reviewLatencyAvgHours > 8) score -= 10;
    if (openPRs > 10) score -= 15;
    if (commitFrequency < 2) score -= 15;

    const burnoutRisk =
      commitFrequency > 15 ? "high" : commitFrequency > 8 ? "medium" : "low";
    const deliveryPredictability = Math.min(
      100,
      mergedPRs > 0 ? Math.round((mergedPRs / (mergedPRs + openPRs)) * 100) : 0,
    );

    const metrics = {
      prCycleAvgHours,
      reviewLatencyAvgHours,
      commitFrequency,
      openPRs,
      mergedPRs,
    };
    const insights = await generateSprintInsights(metrics);

    const sprintHealth = await prisma.sprintHealth.create({
      data: {
        sprintName: sprintName || `Sprint ${new Date().toLocaleDateString()}`,
        healthScore: Math.max(0, score),
        deliveryPredictability,
        burnoutRisk,
        prCycleAvgHours: +prCycleAvgHours.toFixed(2),
        reviewLatencyAvgHours: +reviewLatencyAvgHours.toFixed(2),
        commitFrequency: +commitFrequency.toFixed(2),
        openPRs,
        mergedPRs,
        insights,
        organizationId: orgId,
      },
    });

    res.json(sprintHealth);
  } catch (err) {
    console.error("Sprint health error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── List contributors for a repo ──────────────────────────────────────────────
exports.listRepoContributors = async (req, res) => {
  try {
    const repo = await prisma.repository.findUnique({
      where: { id: req.params.repoId },
    });
    if (!repo || repo.organizationId !== req.params.orgId) {
      return res.status(404).json({ error: "Repository not found" });
    }
    const [owner, repoName] = repo.fullName.split("/");
    const accessToken = req.user.accessToken;
    const contributors = await getRepoContributors(accessToken, owner, repoName);

    // Fetch profiles in parallel to get emails
    const profiles = await Promise.all(
      contributors.map((c) =>
        getUserProfile(accessToken, c.login).catch(() => null),
      ),
    );

    res.json(
      contributors.map((c, i) => {
        const profile = profiles[i];
        return {
          login: c.login,
          avatarUrl: c.avatar_url,
          contributions: c.contributions,
          profileUrl: c.html_url,
          email: profile?.email || null,
          name: profile?.name || null,
        };
      }),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── List sprint health history ─────────────────────────────────────────────────
exports.listSprintHealth = async (req, res) => {
  try {
    const records = await prisma.sprintHealth.findMany({
      where: { organizationId: req.params.orgId },
      orderBy: { generatedAt: "desc" },
      take: 10,
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete a sprint health record ──────────────────────────────────────────────
exports.deleteSprintHealth = async (req, res) => {
  try {
    const record = await prisma.sprintHealth.findUnique({
      where: { id: req.params.sprintId },
    });
    if (!record || record.organizationId !== req.params.orgId) {
      return res.status(404).json({ error: "Sprint health record not found" });
    }
    await prisma.sprintHealth.delete({ where: { id: req.params.sprintId } });
    await logAudit({
      userId: req.userId,
      organizationId: req.params.orgId,
      action: "sprint-health.deleted",
      resourceType: "SprintHealth",
      resourceId: req.params.sprintId,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
