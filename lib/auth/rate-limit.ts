import type { PrismaClient, SecurityEventType } from "@prisma/client";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { logError } from "@/lib/logger";

type SecurityDatabase = Pick<PrismaClient, "securityEvent">;
type SecurityRateLimitResult = {
  allowed: boolean;
  degraded?: boolean;
};

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
): Promise<SecurityRateLimitResult> {
  const subjectHash = hashSubject(`${input.type}:${input.subject}`);
  const since = new Date(Date.now() - input.windowMs);
  let recentCount: number;

  try {
    recentCount = await database.securityEvent.count({
      where: {
        type: input.type,
        subjectHash,
        createdAt: {
          gte: since,
        },
      },
    });
  } catch (error) {
    logError(
      {
        error,
        operation: "count",
        subjectHash,
        type: input.type,
      },
      "auth.security_event",
    );

    return {
      allowed: true,
      degraded: true,
    };
  }

  if (recentCount >= input.maxAttempts) {
    return {
      allowed: false,
    };
  }

  try {
    await database.securityEvent.create({
      data: {
        type: input.type,
        subjectHash,
        userId: input.userId,
      },
    });
  } catch (error) {
    logError(
      {
        error,
        operation: "create",
        subjectHash,
        type: input.type,
      },
      "auth.security_event",
    );

    return {
      allowed: true,
      degraded: true,
    };
  }

  return {
    allowed: true,
  };
}
