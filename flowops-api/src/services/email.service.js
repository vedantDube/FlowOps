/**
 * Feature #5: Email Notification Service
 * Uses nodemailer for transactional emails
 * Configure with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars
 */

const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

const FROM_EMAIL = process.env.EMAIL_FROM || "FlowOps <noreply@flowops.io>";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Create transporter (falls back to console logging if SMTP not configured)
let transporter;
try {
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
} catch (err) {
  logger.warn({ err }, "Email transporter not configured");
}

/**
 * Send an email (or log to console if SMTP not configured)
 */
async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    logger.info({ to, subject }, "Email preview (SMTP not configured)");
    return { preview: true };
  }

  try {
    const result = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });
    return result;
  } catch (err) {
    logger.error({ err, to, subject }, "Email send failed");
    throw err;
  }
}

/**
 * Welcome email on first signup
 */
async function sendWelcomeEmail(user) {
  if (!user.email) return;
  return sendEmail({
    to: user.email,
    subject: "Welcome to FlowOps! 🚀",
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #4ADE80, #0D9488); border-radius: 12px; line-height: 48px; font-size: 20px;">⚡</div>
          <h1 style="color: #111; margin: 16px 0 8px;">Welcome to FlowOps</h1>
        </div>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">Hi <strong>${user.username}</strong>,</p>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">Your account is set up and ready! Here's how to get the most out of FlowOps:</p>
        <div style="background: #f8fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 12px; font-weight: 600; color: #111;">Quick Start Guide:</p>
          <ol style="color: #555; padding-left: 20px; line-height: 1.8;">
            <li>Connect your GitHub repositories</li>
            <li>Explore your engineering metrics dashboard</li>
            <li>Try AI-powered code review on a PR</li>
            <li>Generate living documentation with AutoDocs</li>
          </ol>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #4ADE80, #0D9488); color: #000; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">Go to Dashboard →</a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 40px;">FlowOps – AI Engineering Intelligence Platform</p>
      </div>
    `,
    text: `Welcome to FlowOps, ${user.username}! Visit ${FRONTEND_URL}/dashboard to get started.`,
  });
}

/**
 * AI review completed notification
 */
async function sendReviewNotification(user, review, pr) {
  if (!user.email) return;
  const scoreEmoji = review.overallScore >= 80 ? "✅" : review.overallScore >= 60 ? "⚠️" : "❌";
  return sendEmail({
    to: user.email,
    subject: `${scoreEmoji} AI Review: ${pr.title} (Score: ${review.overallScore}/100)`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111;">AI Code Review Complete</h2>
        <p style="color: #555;">PR: <strong>${pr.title}</strong> (#${pr.number})</p>
        <div style="background: #f8fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="font-size: 24px; font-weight: 700; color: ${review.overallScore >= 80 ? '#4ADE80' : review.overallScore >= 60 ? '#FB923C' : '#EF4444'};">
            Score: ${review.overallScore}/100
          </p>
          <p style="color: #555;">${review.summary}</p>
        </div>
        <div style="text-align: center;">
          <a href="${FRONTEND_URL}/ai-review" style="display: inline-block; background: linear-gradient(135deg, #4ADE80, #0D9488); color: #000; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600;">View Full Review →</a>
        </div>
      </div>
    `,
    text: `AI Review for "${pr.title}" - Score: ${review.overallScore}/100. ${review.summary}`,
  });
}

/**
 * Weekly digest email
 */
async function sendWeeklyDigest(user, orgName, metrics) {
  if (!user.email) return;
  return sendEmail({
    to: user.email,
    subject: `📊 FlowOps Weekly Digest – ${orgName}`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111;">Weekly Engineering Digest</h2>
        <p style="color: #555;">Here's your team's performance for ${orgName} this week:</p>
        <div style="background: #f8fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #555;">Commits</td><td style="padding: 8px 0; font-weight: 700; text-align: right; color: #111;">${metrics.commits || 0}</td></tr>
            <tr><td style="padding: 8px 0; color: #555;">PRs Merged</td><td style="padding: 8px 0; font-weight: 700; text-align: right; color: #111;">${metrics.prsMerged || 0}</td></tr>
            <tr><td style="padding: 8px 0; color: #555;">Avg PR Cycle Time</td><td style="padding: 8px 0; font-weight: 700; text-align: right; color: #111;">${metrics.avgCycleTime || 'N/A'}h</td></tr>
            <tr><td style="padding: 8px 0; color: #555;">AI Reviews</td><td style="padding: 8px 0; font-weight: 700; text-align: right; color: #111;">${metrics.aiReviews || 0}</td></tr>
            <tr><td style="padding: 8px 0; color: #555;">Security Issues Found</td><td style="padding: 8px 0; font-weight: 700; text-align: right; color: ${(metrics.securityIssues || 0) > 0 ? '#EF4444' : '#4ADE80'};">${metrics.securityIssues || 0}</td></tr>
          </table>
        </div>
        <div style="text-align: center;">
          <a href="${FRONTEND_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #4ADE80, #0D9488); color: #000; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600;">View Dashboard →</a>
        </div>
      </div>
    `,
    text: `Weekly Digest for ${orgName}: ${metrics.commits} commits, ${metrics.prsMerged} PRs merged.`,
  });
}

/**
 * Billing alert email
 */
async function sendBillingAlert(user, type, details) {
  if (!user.email) return;
  const subjects = {
    payment_failed: "⚠️ Payment Failed – FlowOps",
    trial_ending: "⏰ Your FlowOps trial ends soon",
    plan_changed: "✅ Plan Updated – FlowOps",
    plan_canceled: "Your FlowOps subscription has been canceled",
  };
  return sendEmail({
    to: user.email,
    subject: subjects[type] || "FlowOps Billing Update",
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111;">Billing Update</h2>
        <p style="color: #555;">${details.message}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/billing" style="display: inline-block; background: linear-gradient(135deg, #4ADE80, #0D9488); color: #000; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600;">Manage Billing →</a>
        </div>
      </div>
    `,
    text: details.message,
  });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendReviewNotification,
  sendWeeklyDigest,
  sendBillingAlert,
};
