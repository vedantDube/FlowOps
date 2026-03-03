const axios = require("axios");

/**
 * Send a message to a Slack webhook URL
 */
async function sendSlackMessage(webhookUrl, message) {
  await axios.post(webhookUrl, { text: message });
}

/**
 * Send a rich block message (e.g. AI review summary)
 */
async function sendBlockMessage(
  webhookUrl,
  blocks,
  fallbackText = "FlowOps Notification",
) {
  await axios.post(webhookUrl, {
    text: fallbackText,
    blocks,
  });
}

/**
 * Build a Slack notification for a completed AI review
 */
function buildAIReviewBlocks({
  repo,
  prTitle,
  prNumber,
  score,
  summary,
  reviewUrl,
}) {
  const scoreEmoji = score >= 80 ? "✅" : score >= 60 ? "⚠️" : "❌";
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${scoreEmoji} AI Code Review Completed*\n*Repo:* ${repo}\n*PR #${prNumber}:* ${prTitle}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Score:* ${score}/100\n*Summary:* ${summary}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Review" },
          url: reviewUrl,
          style: "primary",
        },
      ],
    },
  ];
}

/**
 * Build a Slack notification for new documentation
 */
function buildDocsBlocks({ orgName, docType, docTitle, docUrl }) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📄 New Documentation Generated*\n*Org:* ${orgName}\n*Type:* ${docType}\n*Title:* ${docTitle}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Docs" },
          url: docUrl,
          style: "primary",
        },
      ],
    },
  ];
}

module.exports = {
  sendSlackMessage,
  sendBlockMessage,
  buildAIReviewBlocks,
  buildDocsBlocks,
};
