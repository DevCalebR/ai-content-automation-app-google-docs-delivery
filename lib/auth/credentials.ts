import { compare } from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { consumeSecurityRateLimit } from "@/lib/auth/rate-limit";

type CredentialsDatabase = Pick<PrismaClient, "user" | "securityEvent">;

export async function authorizeCredentials(
  credentials:
    | Record<string, string>
    | undefined
    | {
        email?: string;
        password?: string;
      },
  options: {
    database?: CredentialsDatabase;
    comparePassword?: (password: string, hash: string) => Promise<boolean>;
  } = {},
) {
  if (!credentials?.email || !credentials.password) {
    return null;
  }

  const database = options.database ?? db;
  const comparePassword = options.comparePassword ?? compare;
  const rateLimit = await consumeSecurityRateLimit(
    {
      type: "SIGN_IN_ATTEMPT",
      subject: credentials.email.toLowerCase(),
      maxAttempts: 5,
      windowMs: 1000 * 60 * 15,
    },
    database,
  );

  if (!rateLimit.allowed) {
    return null;
  }

  const user = await database.user.findUnique({
    where: { email: credentials.email.toLowerCase() },
  });

  if (!user?.passwordHash || !user.emailVerified) {
    return null;
  }

  const isValid = await comparePassword(credentials.password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}
