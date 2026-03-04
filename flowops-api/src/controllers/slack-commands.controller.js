const prisma = require("../services/prisma");

/**
 * Feature #8: Slack Bot Slash Commands
 * Handles incoming Slack slash commands like:
 *   /flowops status
 *   /flowops review <pr-url>
 *   /flowops metrics
 *   /flowops leaderboard
 */

// ── Main slash command handler ────────────────────────────────────────────────
exports.handleSlashCommand = async (req, res) => {
  try {
    const { text, team_id, user_name, response_url } = req.body;

    // Parse command
    const args = (text || "").trim().split(/\s+/);
    const command = args[0]?.toLowerCase();

    // Find org linked to this Slack team
    const integration = await prisma.integration.findFirst({
      where: { type: "slack", externalId: team_id, status: "active" },
      include: { organization: true },
    });

    if (!integration) {
      return res.json({
        response_type: "ephemeral",
        text: "❌ No FlowOps organization is linked to this Slack workspace. Please connect Slack from the Integrations page.",
      });
    }

    const orgId = integration.organizationId;

    switch (command) {
      case "status": {
        const [repoCount, prCount, memberCount] = await Promise.all([
          prisma.repository.count({ where: { organizationId: orgId } }),
          prisma.pullRequest.count({
            where: { repository: { organizationId: orgId }, state: "open" },
          }),
          prisma.organizationMember.count({ where: { organizationId: orgId } }),
        ]);

        return res.json({
          response_type: "in_channel",
          blocks: [
            { type: "header", text: { type: "plain_text", text: `📊 ${integration.organization.name} Status` } },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*Repos:* ${repoCount}` },
                { type: "mrkdwn", text: `*Open PRs:* ${prCount}` },
                { type: "mrkdwn", text: `*Members:* ${memberCount}` },
                { type: "mrkdwn", text: `*Plan:* ${integration.organization.plan}` },
              ],
            },
          ],
        });
      }

      case "metrics": {
        const last30 = new Date();
        last30.setDate(last30.getDate() - 30);

        const [commits, prs, reviews] = await Promise.all([
          prisma.commit.count({
            where: { repository: { organizationId: orgId }, committedAt: { gte: last30 } },
          }),
          prisma.pullRequest.count({
            where: { repository: { organizationId: orgId }, createdAt: { gte: last30 } },
          }),
          prisma.pullRequestReview.count({
            where: {
              pullRequest: { repository: { organizationId: orgId } },
              submittedAt: { gte: last30 },
            },
          }),
        ]);

        return res.json({
          response_type: "in_channel",
          blocks: [
            { type: "header", text: { type: "plain_text", text: "📈 Last 30 Days" } },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*Commits:* ${commits}` },
                { type: "mrkdwn", text: `*PRs Opened:* ${prs}` },
                { type: "mrkdwn", text: `*Reviews:* ${reviews}` },
              ],
            },
          ],
        });
      }

      case "leaderboard": {
        const since = new Date();
        since.setDate(since.getDate() - 30);

        const members = await prisma.organizationMember.findMany({
          where: { organizationId: orgId },
          include: { user: { select: { username: true } } },
        });

        const scores = await Promise.all(
          members.map(async (m) => {
            const reviews = await prisma.pullRequestReview.count({
              where: {
                reviewerUsername: m.user.username,
                pullRequest: { repository: { organizationId: orgId } },
                submittedAt: { gte: since },
              },
            });
            return { username: m.user.username, reviews };
          })
        );

        scores.sort((a, b) => b.reviews - a.reviews);
        const top5 = scores.slice(0, 5);

        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
        const text = top5
          .map((s, i) => `${medals[i]} *${s.username}* — ${s.reviews} reviews`)
          .join("\n");

        return res.json({
          response_type: "in_channel",
          blocks: [
            { type: "header", text: { type: "plain_text", text: "🏆 Top Reviewers (30d)" } },
            { type: "section", text: { type: "mrkdwn", text: text || "No reviews yet!" } },
          ],
        });
      }

      case "help":
      default:
        return res.json({
          response_type: "ephemeral",
          blocks: [
            { type: "header", text: { type: "plain_text", text: "🤖 FlowOps Commands" } },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: [
                  "`/flowops status` — Show org status",
                  "`/flowops metrics` — Last 30 days metrics",
                  "`/flowops leaderboard` — Top reviewers",
                  "`/flowops help` — Show this help",
                ].join("\n"),
              },
            },
          ],
        });
    }
  } catch (err) {
    res.json({ response_type: "ephemeral", text: `❌ Error: ${err.message}` });
  }
};
