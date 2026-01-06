const prisma = require("../services/prisma");

exports.healthCheck = async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      service: "FlowOps API",
      database: "connected",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      database: "not connected",
    });
  }
};
