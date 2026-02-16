const prisma = require("../services/prisma");

exports.githubWebhook = async (req, res) => {
  const event = req.headers["x-github-event"];
  const payload = req.body;

  try {
    console.log("📥 Webhook:", event);

    if (event === "push") {
      await handlePush(payload);
    }

    if (event === "pull_request") {
      await handlePullRequest(payload);
    }

    if (event === "pull_request_review") {
      await handlePullRequestReview(payload);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook failed" });
  }
};
async function handlePush(payload) {
  const repo = payload.repository;

  // 1. Find repository
  const repository = await prisma.repository.findFirst({
    where: { githubRepoId: repo.id.toString() },
  });

  if (!repository) {
    console.log("⚠️ Repo not registered, skipping commits");
    return;
  }

  // 2. Store commits
  for (const commit of payload.commits || []) {
    await prisma.commit.upsert({
      where: { sha: commit.id },
      update: {},
      create: {
        sha: commit.id,
        message: commit.message,
        author: commit.author.name,
        committedAt: new Date(commit.timestamp),
        repositoryId: repository.id,
      },
    });
  }

  console.log(`📦 Stored ${payload.commits.length} commits`);
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
      number_repositoryId: {
        number: pr.number,
        repositoryId: repository.id,
      },
    },
    update: {
      state: pr.state,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
    },
    create: {
      number: pr.number,
      title: pr.title,
      state: pr.state,
      openedAt: new Date(pr.created_at),
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      repositoryId: repository.id,
    },
  });

  console.log(`🔀 PR stored: #${pr.number}`);
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
      reviewedAt: new Date(review.submitted_at),
      pullRequestId: pullRequest.id,
    },
  });

  console.log(`📝 Review stored: ${review.state}`);
}
