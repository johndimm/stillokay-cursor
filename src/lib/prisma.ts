import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

console.log("Initializing Prisma client with DATABASE_URL:", process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Test the connection
prisma.$connect()
  .then(() => console.log("Prisma client connected successfully"))
  .catch((error) => console.error("Prisma client connection error:", error)); 