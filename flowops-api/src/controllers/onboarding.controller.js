const prisma = require("../services/prisma");
const { sendWelcomeEmail } = require("../services/email.service");

/**
 * Feature #4: Onboarding Controller
 */

// ── Get onboarding status ──────────────────────────────────────────────────────
exports.getOnboardingStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                repos: { select: { id: true } },
                integrations: { select: { type: true, status: true } },
                subscription: true,
              },
            },
          },
        },
      },
    });

    const org = user.memberships[0]?.organization;
    const steps = {
      accountCreated: true,
      orgSetup: !!org,
      repoConnected: (org?.repos?.length || 0) > 0,
      firstMetrics: (org?.repos?.length || 0) > 0, // implied
      integrationSetup: (org?.integrations?.filter(i => i.status === "active")?.length || 0) > 0,
    };

    const completedSteps = Object.values(steps).filter(Boolean).length;
    const totalSteps = Object.keys(steps).length;

    res.json({
      onboardingCompleted: user.onboardingCompleted,
      steps,
      progress: Math.round((completedSteps / totalSteps) * 100),
      completedSteps,
      totalSteps,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Complete onboarding ────────────────────────────────────────────────────────
exports.completeOnboarding = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { onboardingCompleted: true },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Send welcome email ─────────────────────────────────────────────────────────
exports.sendWelcome = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    await sendWelcomeEmail(user);
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
