const prisma = require("./prisma");
const { emitToOrg, emitToUser, EVENTS } = require("./socket.service");
const { sendEmail } = require("./email.service");
const { sendBlockMessage, buildAutomationBlocks } = require("./slack.service");
const logger = require("../utils/logger");

const SLACK_EMOJI = {
  stale_pr: "⏰",
  unassigned_reviewer: "🙋",
  auto_approved: "✨",
};

/**
 * Create a notification and push it in real time.
 * userId omitted => org-wide notification (visible to all members).
 * Optionally emails the target user(s) if they've opted into email alerts
 * for automation nudges (reuses the `emailReview` preference), and/or
 * posts to the org's connected Slack webhook if one exists.
 */
async function createNotification({ organizationId, userId = null, type, title, body, link, metadata, email = false, slack = false }) {
  const notification = await prisma.notification.create({
    data: { organizationId, userId, type, title, body, link, metadata },
  });

  if (userId) {
    emitToUser(userId, EVENTS.NOTIFICATION, notification);
  } else {
    emitToOrg(organizationId, EVENTS.NOTIFICATION, notification);
  }

  if (email) {
    await emailRecipients({ organizationId, userId, title, body, link });
  }

  if (slack) {
    await postToSlack({ organizationId, type, title, body, link });
  }

  return notification;
}

async function postToSlack({ organizationId, type, title, body, link }) {
  try {
    const integration = await prisma.integration.findUnique({
      where: { type_organizationId: { type: "slack", organizationId } },
    });
    const webhookUrl = integration?.status === "active" && integration.config?.webhookUrl;
    if (!webhookUrl) return;

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const blocks = buildAutomationBlocks({
      title,
      body,
      link: link ? `${frontendUrl}${link}` : undefined,
      emoji: SLACK_EMOJI[type] || "🔔",
    });
    await sendBlockMessage(webhookUrl, blocks, title);
  } catch (err) {
    logger.warn({ err, organizationId }, "Notification Slack dispatch failed");
  }
}

async function emailRecipients({ organizationId, userId, title, body, link }) {
  try {
    const recipients = userId
      ? await prisma.user.findMany({ where: { id: userId }, include: { notificationPref: true } })
      : (
          await prisma.organizationMember.findMany({
            where: { organizationId },
            include: { user: { include: { notificationPref: true } } },
          })
        ).map((m) => m.user);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    for (const user of recipients) {
      if (!user?.email) continue;
      if (user.notificationPref && user.notificationPref.emailReview === false) continue;
      await sendEmail({
        to: user.email,
        subject: `FlowOps: ${title}`,
        html: `<div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color:#111;">${title}</h2>
          <p style="color:#555;">${body || ""}</p>
          <a href="${frontendUrl}${link || "/dashboard"}" style="display:inline-block; background:linear-gradient(135deg,#4ADE80,#0D9488); color:#000; padding:10px 24px; border-radius:8px; text-decoration:none; font-weight:600;">View in FlowOps →</a>
        </div>`,
        text: `${title}\n${body || ""}\n${frontendUrl}${link || "/dashboard"}`,
      });
    }
  } catch (err) {
    logger.warn({ err }, "Notification email dispatch failed");
  }
}

module.exports = { createNotification };
