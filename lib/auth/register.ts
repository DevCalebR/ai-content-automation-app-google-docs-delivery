import { hash } from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { logAuditEvent, logError } from "@/lib/logger";
import { signUpSchema } from "@/lib/validations/auth";
import { consumeSecurityRateLimit } from "@/lib/auth/rate-limit";
import { issueEmailVerificationToken } from "@/lib/auth/tokens";
import { sendTransactionalEmail } from "@/lib/email/service";
import { buildVerificationEmail } from "@/lib/email/templates";

type AuthDatabase = Pick<
  PrismaClient,
  "user" | "usageEvent" | "securityEvent" | "emailVerificationToken"
>;

export type RegisterUserResult =
  | {
      status: "error";
      message: string;
    }
  | {
      status: "success";
      redirectTo: string;
      email: string;
    };

export async function registerUser(
  input: {
    name: FormDataEntryValue | null;
    email: FormDataEntryValue | null;
    password: FormDataEntryValue | null;
  },
  options: {
    database?: AuthDatabase;
    hashPassword?: (password: string, rounds: number) => Promise<string>;
    audit?: typeof logAuditEvent;
    sendEmail?: typeof sendTransactionalEmail;
  } = {},
): Promise<RegisterUserResult> {
  const parsed = signUpSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter valid account details.",
    };
  }

  const database = options.database ?? db;
  const hashPassword = options.hashPassword ?? hash;
  const audit = options.audit ?? logAuditEvent;
  const sendEmail = options.sendEmail ?? sendTransactionalEmail;
  const rateLimit = await consumeSecurityRateLimit(
    {
      type: "SIGN_UP_ATTEMPT",
      subject: parsed.data.email,
      maxAttempts: 3,
      windowMs: 1000 * 60 * 15,
    },
    database,
  );

  if (!rateLimit.allowed) {
    return {
      status: "error",
      message: "Too many attempts. Try again shortly.",
    };
  }

  const existingUser = await database.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser?.emailVerified) {
    return {
      status: "success",
      redirectTo: `/sign-in?registered=1&email=${encodeURIComponent(parsed.data.email)}`,
      email: parsed.data.email,
    };
  }

  const user =
    existingUser ??
    (await database.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password, 12),
      },
    }));

  try {
    const verificationToken = await issueEmailVerificationToken(user.id, database);

    await sendEmail(buildVerificationEmail(user.email, verificationToken));
  } catch (error) {
    logError(error, "register.send_verification");

    return {
      status: "error",
      message: "We couldn't start email verification. Try again.",
    };
  }

  await database.usageEvent.create({
    data: {
      userId: user.id,
      type: "AUTH_SIGN_UP",
    },
  });

  audit({
    action: "auth.sign_up",
    userId: user.id,
  });

  return {
    status: "success",
    redirectTo: `/sign-in?registered=1&email=${encodeURIComponent(user.email)}`,
    email: user.email,
  };
}
