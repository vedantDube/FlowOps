const prisma = require("../services/prisma");

exports.githubWebhook = async (req, res) => {
  const event = req.headers["x-github-event"];
  const payload = req.body;

  try {
    switch (event) {
      case "push":
        await handlePush(payload);
        break;

      case "pull_request":
        await handlePullRequest(payload);
        break;

      case "pull_request_review":
        await handlePullRequestReview(payload);
        break;

      default:
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook failed" });
  }
};

async function handlePush(payload) {
  const commits = payload.commits || [];
  console.log(`📦 Push event: ${commits.length} commits`);
}

async function handlePullRequest(payload) {
  const pr = payload.pull_request;
  console.log(`🔀 PR ${payload.action}: #${pr.number}`);
}

async function handlePullRequestReview(payload) {
  const review = payload.review;
  console.log(`📝 PR review: ${review.state}`);
}
