const crypto = require("crypto");
const prisma = require("../services/prisma");

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
    console.log(`📥 GitHub Webhook: ${event}`);

    if (event === "push") await handlePush(payload);
    if (event === "pull_request") await handlePullRequest(payload);
    if (event === "pull_request_review") await handlePullRequestReview(payload);

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

async function handlePush(payload) {
  const repo = payload.repository;
  const repository = await prisma.repository.findFirst({
    where: { githubRepoId: repo.id.toString() },
  });

  if (!repository) {
    console.log(`⚠️ Repo ${repo.full_name} not registered, skipping`);
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
  console.log(`📦 Stored ${commits.length} commits for ${repo.full_name}`);
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

  console.log(`🔀 PR #${pr.number} stored for ${repo.full_name}`);
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

  console.log(`📝 Review (${review.state}) by ${review.user.login} stored`);
}
