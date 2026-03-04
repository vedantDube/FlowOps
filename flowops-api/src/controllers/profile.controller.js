const prisma = require("../services/prisma");

// ── Get own profile
exports.getProfile = async (req, res) => {
  try {
    let profile = await prisma.developerProfile.findUnique({
      where: { userId: req.userId },
    });
    if (!profile) {
      profile = await prisma.developerProfile.create({
        data: { userId: req.userId },
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { username: true, email: true, avatarUrl: true, createdAt: true },
    });
    res.json({ ...profile, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { bio, website, twitter, linkedin, location, skills, isPublic } = req.body;
    const profile = await prisma.developerProfile.upsert({
      where: { userId: req.userId },
      update: { bio, website, twitter, linkedin, location, skills, isPublic },
      create: { userId: req.userId, bio, website, twitter, linkedin, location, skills, isPublic },
    });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get public profile by username
exports.getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findFirst({
      where: { username },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        profile: true,
        achievements: {
          where: { earnedAt: { not: null } },
          include: { achievement: true },
          orderBy: { earnedAt: "desc" },
        },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.profile?.isPublic) return res.status(403).json({ error: "Profile is private" });

    res.json({
      username: user.username,
      avatarUrl: user.avatarUrl,
      joinedAt: user.createdAt,
      bio: user.profile?.bio,
      website: user.profile?.website,
      twitter: user.profile?.twitter,
      linkedin: user.profile?.linkedin,
      location: user.profile?.location,
      skills: user.profile?.skills,
      achievements: user.achievements.map((a) => ({
        name: a.achievement.name,
        icon: a.achievement.icon,
        description: a.achievement.description,
        earnedAt: a.earnedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
