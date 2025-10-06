const { PrismaClient } = require("../generated/prisma"); // Prisma v6
const prisma = new PrismaClient();
module.exports = prisma;