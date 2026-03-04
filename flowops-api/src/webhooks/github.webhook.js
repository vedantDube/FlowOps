const crypto = require("crypto");
const prisma = require("../services/prisma");
const { emitToOrg, emitToRepo, EVENTS } = require("../services/socket.service");
const { reviewPullRequest } = require("../services/gemini");
const { getPullRequestFiles } = require("../services/github.service");
const { getActiveRules } = require("../controllers/review-rules.controller");
const { recordUsage } = require("../middleware/plan.middleware");
const logger = require("../utils/logger");

exports.githubWebhook = async (req, res) => {
  // Verify webhook signature
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers["x-hub-signature-256"];
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");
    if (sig !== expected)
      return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.headers["x-github-event"];
  const payload = req.body;

  try {
    logger.info({ event }, "GitHub webhook received");

    if (event === "push") await handlePush(payload);
    if (event === "pull_request") await handlePullRequest(payload);
    if (event === "pull_request_review") await handlePullRequestReview(payload);

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error({ err }, "Webhook processing failed");
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

async function handlePush(payload) {
  const repo = payload.repository;
  const repository = await prisma.repository.findFirst({
    where: { githubRepoId: repo.id.toString() },
  });

  if (!repository) {
    logger.debug({ repo: repo.full_name }, "Repo not registered, skipping");
    return;
  }

  const commits = payload.commits || [];
  for (const commit of commits) {
    await prisma.commit.upsert({
      where: { sha: commit.id },
      update: {},
      create: {
        sha: commit.id,
        message: commit.message,
        author: commit.author.name,
        authorEmail: commit.author.email || null,
        additions: commit.added?.length || 0,
        deletions: commit.removed?.length || 0,
        filesChanged:
          (commit.added?.length || 0) +
          (commit.modified?.length || 0) +
          (commit.removed?.length || 0),
        committedAt: new Date(commit.timestamp),
        repositoryId: repository.id,
      },
    });
  }
  logger.info({ count: commits.length, repo: repo.full_name }, "Stored commits");

  // Emit real-time update
  emitToOrg(repository.organizationId, EVENTS.COMMIT_PUSHED, {
    repoId: repository.id,
    repoName: repo.full_name,
    count: commits.length,
  });
}

async function handlePullRequest(payload) {
  const pr = payload.pull_request;
  const repo = payload.repository;

  const repository = await prisma.repository.findFirst({
    where: { githubRepoId: repo.id.toString() },
  });
  if (!repository) return;

  await prisma.pullRequest.upsert({
    where: {
      number_repositoryId: { number: pr.number, repositoryId: repository.id },
    },
    update: {
      state: pr.merged_at ? "merged" : pr.state,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      changedFiles: pr.changed_files || 0,
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
      repositoryId: repository.id,
    },
  });

  logger.info({ prNumber: pr.number, repo: repo.full_name }, "PR stored");

  // Emit real-time update
  emitToOrg(repository.organizationId, EVENTS.PR_UPDATED, {
    repoId: repository.id,
    repoName: repo.full_name,
    prNumber: pr.number,
    prTitle: pr.title,
    action: pr.merged_at ? "merged" : pr.state,
  });

  // ── Feature #6: Auto-review on PR open/synchronize ────────────────────
  if (payload.action === "opened" || payload.action === "synchronize") {
    try {
      // Find a user with access token for this org
      const member = await prisma.organizationMember.findFirst({
        where: { organizationId: repository.organizationId },
        include: { user: true },
      });
      if (!member?.user?.accessToken) return;

      const [owner, repoName] = repository.fullName.split("/");
      const files = await getPullRequestFiles(member.user.accessToken, owner, repoName, pr.number);
      const diff = files.map((f) => `--- ${f.filename}\n${f.patch || ""}`).join("\n\n");

      // Get custom review rules for this org
      const customRules = await getActiveRules(repository.organizationId);

      const aiResult = await reviewPullRequest({
        title: pr.title,
        body: pr.body,
        diff,
        repoName: repository.fullName,
        customRules,
      });

      // Find/create the PR record
      const prRecord = await prisma.pullRequest.findFirst({
        where: { number: pr.number, repositoryId: repository.id },
      });
      if (prRecord) {
        await prisma.aICodeReview.upsert({
          where: { pullRequestId: prRecord.id },
          create: {
            pullRequestId: prRecord.id,
            repositoryId: repository.id,
            status: "completed",
            summary: aiResult.summary,
            overallScore: aiResult.overallScore,
            securityIssues: aiResult.securityIssues || [],
            performanceHints: aiResult.performanceHints || [],
            antiPatterns: aiResult.antiPatterns || [],
            refactorSuggestions: aiResult.refactorSuggestions || [],
          },
          update: {
            status: "completed",
            summary: aiResult.summary,
            overallScore: aiResult.overallScore,
            securityIssues: aiResult.securityIssues || [],
            performanceHints: aiResult.performanceHints || [],
            antiPatterns: aiResult.antiPatterns || [],
            refactorSuggestions: aiResult.refactorSuggestions || [],
          },
        });

        await recordUsage(repository.organizationId, "ai_review");

        emitToOrg(repository.organizationId, EVENTS.REVIEW_COMPLETED, {
          repoId: repository.id,
          prNumber: pr.number,
          prTitle: pr.title,
          score: aiResult.overallScore,
        });

        logger.info({ prNumber: pr.number, repo: repo.full_name, score: aiResult.overallScore }, "Auto-reviewed PR");
      }
    } catch (autoErr) {
      logger.warn({ err: autoErr, prNumber: pr.number }, "Auto-review failed");
    }
  }
}

async function handlePullRequestReview(payload) {
  const review = payload.review;
  const pr = payload.pull_request;

  const pullRequest = await prisma.pullRequest.findFirst({
    where: { number: pr.number },
  });
  if (!pullRequest) return;

  await prisma.pullRequestReview.create({
    data: {
      state: review.state,
      reviewer: review.user.login,
      body: review.body || null,
      reviewedAt: new Date(review.submitted_at),
      pullRequestId: pullRequest.id,
    },
  });

  logger.info({ reviewer: review.user.login, state: review.state }, "PR review stored");

  // Emit real-time update
  const repo = await prisma.repository.findFirst({
    where: { pullRequests: { some: { id: pullRequest.id } } },
  });
  if (repo) {
    emitToOrg(repo.organizationId, EVENTS.REVIEW_COMPLETED, {
      repoId: repo.id,
      prNumber: pr.number,
      reviewer: review.user.login,
      state: review.state,
    });
  }
}
