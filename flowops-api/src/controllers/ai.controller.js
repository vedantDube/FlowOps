const prisma = require("../services/prisma");
const { reviewPullRequest, reviewCode } = require("../services/gemini");
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

    // Run Gemini review
    const aiResult = await reviewPullRequest({
      title: pr.title,
      body: pr.body,
      diff,
      repoName: pr.repository.fullName,
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

    await logAudit({
      userId: req.userId,
      organizationId: pr.repository.organizationId,
      action: "ai.review.generated",
      resourceType: "PullRequest",
      resourceId: pullRequestId,
    });

    res.json(review);
  } catch (err) {
    console.error("AI Review error:", err);
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
      if (repoCount === 0) return res.json({ reviews: [], total: 0, page: 1, limit: parseInt(limit) });
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
    const code = files
      .map((f) => `── ${f.path} ──\n${f.content}`)
      .join("\n\n");

    const fileName =
      paths.length === 1 ? paths[0] : `${paths.length} files`;

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
    console.error("Code review from GitHub error:", err);
    res.status(500).json({ error: err.message });
  }
};
