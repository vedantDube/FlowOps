const prisma = require("../services/prisma");
const {
  reviewPullRequest,
  reviewCode,
  askAssistant: askAssistantAI,
  generateEngineeringNarrative,
  generateStandup,
} = require("../services/gemini");
const {
  getPullRequestDiff,
  getPullRequestFiles,
  getFileContent,
  getRepoFilesContent,
  getUserRepos,
} = require("../services/github.service");
const {
  sendBlockMessage,
  buildAIReviewBlocks,
} = require("../services/slack.service");
const { logAudit } = require("../middleware/audit.middleware");
const { getActiveRules } = require("./review-rules.controller");
const { recordUsage } = require("../middleware/plan.middleware");
const { emitToOrg, EVENTS } = require("../services/socket.service");
const { sendReviewNotification } = require("../services/email.service");
const logger = require("../utils/logger");

// ── Trigger AI review for a PR ─────────────────────────────────────────────────
exports.reviewPR = async (req, res) => {
  const { pullRequestId } = req.body;

  try {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: { repository: { include: { organization: true } } },
    });

    if (!pr) return res.status(404).json({ error: "Pull request not found" });

    // Check existing review
    const existing = await prisma.aICodeReview.findUnique({
      where: { pullRequestId },
    });
    if (existing && existing.status === "completed") {
      return res.json(existing);
    }

    // Create/update to pending
    await prisma.aICodeReview.upsert({
      where: { pullRequestId },
      create: {
        pullRequestId,
        repositoryId: pr.repositoryId,
        status: "pending",
      },
      update: { status: "pending" },
    });

    // Get diff from GitHub
    const user = await prisma.user.findFirst({
      where: {
        memberships: { some: { organizationId: pr.repository.organizationId } },
      },
    });

    let diff = "";
    try {
      const [owner, repo] = pr.repository.fullName.split("/");
      const files = await getPullRequestFiles(
        user.accessToken,
        owner,
        repo,
        pr.number,
      );
      diff = files
        .map((f) => `--- ${f.filename}\n${f.patch || ""}`)
        .join("\n\n");
    } catch {
      diff = "Diff unavailable.";
    }

    // Run Gemini review with custom rules
    const customRules = await getActiveRules(pr.repository.organizationId);

    const aiResult = await reviewPullRequest({
      title: pr.title,
      body: pr.body,
      diff,
      repoName: pr.repository.fullName,
      customRules,
    });

    // Save result
    const review = await prisma.aICodeReview.update({
      where: { pullRequestId },
      data: {
        status: "completed",
        summary: aiResult.summary,
        overallScore: aiResult.overallScore,
        securityIssues: aiResult.securityIssues || [],
        performanceHints: aiResult.performanceHints || [],
        antiPatterns: aiResult.antiPatterns || [],
        refactorSuggestions: aiResult.refactorSuggestions || [],
      },
    });

    // Notify Slack if configured
    try {
      const slackIntegration = await prisma.integration.findUnique({
        where: {
          type_organizationId: {
            type: "slack",
            organizationId: pr.repository.organizationId,
          },
        },
      });
      if (slackIntegration?.status === "active") {
        const cfg = slackIntegration.config;
        const blocks = buildAIReviewBlocks({
          repo: pr.repository.name,
          prTitle: pr.title,
          prNumber: pr.number,
          score: aiResult.overallScore,
          summary: aiResult.summary,
          reviewUrl: `${process.env.FRONTEND_URL}/ai-review/${review.id}`,
        });
        await sendBlockMessage(cfg.webhookUrl, blocks);
      }
    } catch {
      /* non-fatal */
    }

    // Email the requester — opt-in (emailReview preference defaults to false).
    try {
      const requester = await prisma.user.findUnique({
        where: { id: req.userId },
        include: { notificationPref: true },
      });
      if (requester?.notificationPref?.emailReview) {
        sendReviewNotification(requester, review, pr).catch(() => {});
      }
    } catch {
      /* non-fatal */
    }

    await logAudit({
      userId: req.userId,
      organizationId: pr.repository.organizationId,
      action: "ai.review.generated",
      resourceType: "PullRequest",
      resourceId: pullRequestId,
    });

    // Record usage and emit real-time update
    await recordUsage(pr.repository.organizationId, "ai_review");
    emitToOrg(pr.repository.organizationId, EVENTS.AI_REVIEW_COMPLETE, {
      repoId: pr.repositoryId,
      prNumber: pr.number,
      prTitle: pr.title,
      score: aiResult.overallScore,
    });

    res.json(review);
  } catch (err) {
    logger.error({ err }, "AI Review error");
    await prisma.aICodeReview
      .upsert({
        where: { pullRequestId },
        update: { status: "failed" },
        create: {
          pullRequestId,
          repositoryId: req.body.repositoryId,
          status: "failed",
        },
      })
      .catch(() => {});
    res.status(500).json({ error: err.message });
  }
};

// ── Get all AI reviews for an org ─────────────────────────────────────────────
exports.listReviews = async (req, res) => {
  try {
    const { orgId, repoId, limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Only return reviews when at least one repo is connected
    if (orgId) {
      const repoCount = await prisma.repository.count({
        where: { organizationId: orgId },
      });
      if (repoCount === 0)
        return res.json({
          reviews: [],
          total: 0,
          page: 1,
          limit: parseInt(limit),
        });
    }

    const where = { status: "completed" };
    if (repoId) where.repositoryId = repoId;
    if (orgId) where.repository = { organizationId: orgId };

    const [reviews, total] = await Promise.all([
      prisma.aICodeReview.findMany({
        where,
        include: {
          pullRequest: true,
          repository: { select: { name: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: parseInt(limit),
        skip,
      }),
      prisma.aICodeReview.count({ where }),
    ]);

    res.json({ reviews, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get single review ──────────────────────────────────────────────────────────
exports.getReview = async (req, res) => {
  try {
    const review = await prisma.aICodeReview.findUnique({
      where: { id: req.params.id },
      include: {
        pullRequest: { include: { reviews: true } },
        repository: true,
      },
    });
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Review code from GitHub (file or multiple files) ──────────────────────────
exports.reviewCodeFromGithub = async (req, res) => {
  const { owner, repo, branch, filePaths } = req.body;

  if (!owner || !repo || !filePaths?.length) {
    return res
      .status(400)
      .json({ error: "owner, repo, and filePaths are required" });
  }

  // Limit to 20 files for code review
  const paths = filePaths.slice(0, 20);

  try {
    const files = await getRepoFilesContent(
      req.user.accessToken,
      owner,
      repo,
      paths,
      branch || "main",
    );

    // Build combined code context
    const code = files.map((f) => `── ${f.path} ──\n${f.content}`).join("\n\n");

    const fileName = paths.length === 1 ? paths[0] : `${paths.length} files`;

    const aiResult = await reviewCode({
      code,
      fileName,
      repoName: `${owner}/${repo}`,
    });

    // Return the AI review result directly (no DB save for ad-hoc reviews)
    const result = {
      id: `adhoc-${Date.now()}`,
      status: "completed",
      source: "github",
      repoName: `${owner}/${repo}`,
      fileName,
      filesReviewed: paths,
      summary: aiResult.summary,
      overallScore: aiResult.overallScore,
      securityIssues: aiResult.securityIssues || [],
      performanceHints: aiResult.performanceHints || [],
      antiPatterns: aiResult.antiPatterns || [],
      refactorSuggestions: aiResult.refactorSuggestions || [],
      createdAt: new Date().toISOString(),
    };

    await logAudit({
      userId: req.userId,
      organizationId: req.body.organizationId || null,
      action: "ai.review.code",
      resourceType: "Repository",
      resourceId: `${owner}/${repo}`,
      metadata: { fileCount: paths.length },
    });

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Code review from GitHub error");
    res.status(500).json({ error: err.message });
  }
};

// ── Ask the AI help assistant a free-form question ────────────────────────────
exports.askAssistant = async (req, res) => {
  const { question, organizationId, pageContext } = req.body;

  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "question is required" });
  }
  if (question.length > 2000) {
    return res.status(400).json({ error: "question is too long (max 2000 characters)" });
  }

  try {
    const answer = await askAssistantAI({
      question: question.trim(),
      pageContext: typeof pageContext === "string" ? pageContext.slice(0, 100) : undefined,
    });

    if (organizationId) {
      await recordUsage(organizationId, "ai_assistant").catch(() => {});
    }

    res.json({ answer });
  } catch (err) {
    logger.error({ err }, "AI Assistant error");
    res.status(500).json({ error: "The assistant is temporarily unavailable. Please try again." });
  }
};

// ── Shared helpers for narrative & standup ─────────────────────────────────────

async function requireOrgMember(req, res, organizationId) {
  if (!organizationId) {
    res.status(400).json({ error: "organizationId is required" });
    return null;
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: req.userId, organizationId },
    include: { organization: true },
  });
  if (!membership) {
    res.status(403).json({ error: "Not a member of this organization" });
    return null;
  }
  return membership.organization;
}

const hoursBetween = (a, b) => (new Date(b) - new Date(a)) / 3_600_000;
const avgOf = (arr) =>
  arr.length ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : 0;

// ── AI State of Engineering narrative ─────────────────────────────────────────
exports.generateNarrative = async (req, res) => {
  try {
    const { organizationId, days = 7 } = req.body;
    const org = await requireOrgMember(req, res, organizationId);
    if (!org) return;

    const windowDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 90);
    const since = new Date();
    since.setDate(since.getDate() - windowDays);
    since.setHours(0, 0, 0, 0);
    const prevSince = new Date(since);
    prevSince.setDate(prevSince.getDate() - windowDays);

    const repoScope = { repository: { organizationId } };

    const [closedPRs, prevClosedPRs, openPRs, mergedCount, reviews, commits, deployments, incidents] =
      await Promise.all([
        prisma.pullRequest.findMany({
          where: { ...repoScope, closedAt: { gte: since } },
          select: { openedAt: true, closedAt: true, mergedAt: true, title: true, author: true },
        }),
        prisma.pullRequest.findMany({
          where: { ...repoScope, closedAt: { gte: prevSince, lt: since } },
          select: { openedAt: true, closedAt: true },
        }),
        prisma.pullRequest.count({ where: { ...repoScope, state: "open" } }),
        prisma.pullRequest.count({ where: { ...repoScope, mergedAt: { gte: since } } }),
        prisma.pullRequestReview.findMany({
          where: { pullRequest: repoScope, reviewedAt: { gte: since } },
          select: { reviewer: true, reviewedAt: true, pullRequest: { select: { openedAt: true } } },
        }),
        prisma.commit.findMany({
          where: { ...repoScope, committedAt: { gte: since } },
          select: { author: true, committedAt: true },
        }),
        prisma.deployment.count({
          where: { ...repoScope, kind: "deployment", status: "success", deployedAt: { gte: since } },
        }),
        prisma.incident.count({ where: { organizationId, detectedAt: { gte: since } } }),
      ]);

    const cycleTimes = closedPRs.map((pr) => hoursBetween(pr.openedAt, pr.closedAt));
    const prevCycleTimes = prevClosedPRs.map((pr) => hoursBetween(pr.openedAt, pr.closedAt));
    const reviewDelays = reviews.map((r) => hoursBetween(r.pullRequest.openedAt, r.reviewedAt));

    const countBy = (arr, key) => {
      const out = {};
      for (const item of arr) out[item[key]] = (out[item[key]] || 0) + 1;
      return Object.entries(out)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));
    };

    const afterHoursCommits = commits.filter((c) => {
      const h = new Date(c.committedAt).getUTCHours();
      return h < 8 || h >= 20;
    }).length;
    const weekendCommits = commits.filter((c) => {
      const d = new Date(c.committedAt).getUTCDay();
      return d === 0 || d === 6;
    }).length;

    const metrics = {
      prCycleTimeAvgHours: avgOf(cycleTimes),
      prCycleTimePrevPeriodAvgHours: avgOf(prevCycleTimes),
      reviewLatencyAvgHours: avgOf(reviewDelays),
      prsClosed: closedPRs.length,
      prsMerged: mergedCount,
      prsOpen: openPRs,
      totalCommits: commits.length,
      commitsByAuthor: countBy(commits, "author"),
      reviewsByReviewer: countBy(reviews, "reviewer"),
      successfulDeployments: deployments,
      incidentsDetected: incidents,
      afterHoursCommitPct: commits.length ? +((afterHoursCommits / commits.length) * 100).toFixed(1) : 0,
      weekendCommitPct: commits.length ? +((weekendCommits / commits.length) * 100).toFixed(1) : 0,
    };

    const narrative = await generateEngineeringNarrative({
      orgName: org.name,
      windowDays,
      metrics,
    });

    await logAudit({
      userId: req.userId,
      organizationId,
      action: "ai.narrative.generated",
      metadata: { windowDays },
    });
    await recordUsage(organizationId, "ai_narrative").catch(() => {});

    res.json({ narrative, metrics, windowDays, generatedAt: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "AI narrative error");
    res.status(500).json({ error: "Could not generate the report. Please try again." });
  }
};

// ── AI daily standup summary ───────────────────────────────────────────────────
exports.generateStandupSummary = async (req, res) => {
  try {
    const { organizationId } = req.body;
    const org = await requireOrgMember(req, res, organizationId);
    if (!org) return;

    const since = new Date(Date.now() - 24 * 3_600_000);
    const repoScope = { repository: { organizationId } };

    const [commits, prs, reviews, stalePRs] = await Promise.all([
      prisma.commit.findMany({
        where: { ...repoScope, committedAt: { gte: since } },
        select: { author: true, message: true, repository: { select: { name: true } } },
        orderBy: { committedAt: "desc" },
        take: 200,
      }),
      prisma.pullRequest.findMany({
        where: {
          ...repoScope,
          OR: [{ openedAt: { gte: since } }, { mergedAt: { gte: since } }, { closedAt: { gte: since } }],
        },
        select: { title: true, author: true, state: true, number: true, repository: { select: { name: true } } },
      }),
      prisma.pullRequestReview.findMany({
        where: { pullRequest: repoScope, reviewedAt: { gte: since } },
        select: { reviewer: true, state: true, pullRequest: { select: { title: true, number: true } } },
      }),
      prisma.pullRequest.findMany({
        where: { ...repoScope, state: "open", reviews: { none: {} } },
        select: { title: true, author: true, number: true, openedAt: true },
        orderBy: { openedAt: "asc" },
        take: 10,
      }),
    ]);

    if (!commits.length && !prs.length && !reviews.length) {
      return res.json({
        standup: "_No GitHub activity in the last 24 hours — nothing to report._",
        generatedAt: new Date().toISOString(),
      });
    }

    const activity = {
      commits: commits.map((c) => ({ author: c.author, message: c.message.slice(0, 120), repo: c.repository.name })),
      pullRequests: prs.map((p) => ({ author: p.author, title: p.title, state: p.state, number: p.number, repo: p.repository.name })),
      reviews: reviews.map((r) => ({ reviewer: r.reviewer, state: r.state, pr: `#${r.pullRequest.number} ${r.pullRequest.title}` })),
      openPRsAwaitingFirstReview: stalePRs.map((p) => ({
        title: p.title,
        author: p.author,
        number: p.number,
        openForHours: +hoursBetween(p.openedAt, new Date()).toFixed(0),
      })),
    };

    const standup = await generateStandup({ orgName: org.name, activity });

    await recordUsage(organizationId, "ai_standup").catch(() => {});

    res.json({ standup, generatedAt: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "AI standup error");
    res.status(500).json({ error: "Could not generate the standup. Please try again." });
  }
};
