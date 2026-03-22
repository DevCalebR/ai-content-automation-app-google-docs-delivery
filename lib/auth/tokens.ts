import { createHash, randomBytes } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type EmailVerificationTokenDatabase = Pick<PrismaClient, "emailVerificationToken">;
type PasswordResetTokenDatabase = Pick<PrismaClient, "passwordResetToken">;

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function createRawToken() {
  return randomBytes(32).toString("hex");
}

export async function issueEmailVerificationToken(
  userId: string,
  database: EmailVerificationTokenDatabase = db,
) {
  const token = createRawToken();
  const tokenHash = hashToken(token);

  await database.emailVerificationToken.deleteMany({
    where: { userId },
  });

  await database.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  return token;
}

export async function issuePasswordResetToken(
  userId: string,
  database: PasswordResetTokenDatabase = db,
) {
  const token = createRawToken();
  const tokenHash = hashToken(token);

  await database.passwordResetToken.deleteMany({
    where: { userId },
  });

  await database.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });

  return token;
}
