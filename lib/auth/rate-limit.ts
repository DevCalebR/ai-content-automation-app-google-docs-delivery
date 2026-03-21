import type { PrismaClient, SecurityEventType } from "@prisma/client";
import { createHash } from "crypto";
import { db } from "@/lib/db";

type SecurityDatabase = Pick<PrismaClient, "securityEvent">;

function hashSubject(subject: string) {
  return createHash("sha256").update(subject).digest("hex");
}

export async function consumeSecurityRateLimit(
  input: {
    type: SecurityEventType;
    subject: string;
    maxAttempts: number;
    windowMs: number;
    userId?: string;
  },
  database: SecurityDatabase = db,
) {
  const subjectHash = hashSubject(`${input.type}:${input.subject}`);
  const since = new Date(Date.now() - input.windowMs);

  const recentCount = await database.securityEvent.count({
    where: {
      type: input.type,
      subjectHash,
      createdAt: {
        gte: since,
      },
    },
  });

  if (recentCount >= input.maxAttempts) {
    return {
      allowed: false,
    };
  }

  await database.securityEvent.create({
    data: {
      type: input.type,
      subjectHash,
      userId: input.userId,
    },
  });

  return {
    allowed: true,
  };
}
