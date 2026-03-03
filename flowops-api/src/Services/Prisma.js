const { PrismaClient } = require("@prisma/client");

const prisma =
  globalThis.prismaClient ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = prisma;
}

module.exports = prisma;
