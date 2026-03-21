import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { logAuditEvent, logError } from "@/lib/logger";
import { emailOnlySchema } from "@/lib/validations/auth";
import { consumeSecurityRateLimit } from "@/lib/auth/rate-limit";
import { hashToken, issueEmailVerificationToken } from "@/lib/auth/tokens";
import { sendTransactionalEmail } from "@/lib/email/service";
import { buildVerificationEmail } from "@/lib/email/templates";

type VerificationDatabase = Pick<
  PrismaClient,
  "user" | "emailVerificationToken" | "usageEvent" | "securityEvent"
>;

type VerificationActionState = {
  status: "success" | "error";
  message: string;
};

export async function resendVerificationEmail(
  input: {
    email: FormDataEntryValue | null;
  },
  options: {
    database?: VerificationDatabase;
    audit?: typeof logAuditEvent;
    sendEmail?: typeof sendTransactionalEmail;
  } = {},
): Promise<VerificationActionState> {
  const parsed = emailOnlySchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a valid email address.",
    };
  }

  const database = options.database ?? db;
  const audit = options.audit ?? logAuditEvent;
  const sendEmail = options.sendEmail ?? sendTransactionalEmail;
  const genericSuccess = {
    status: "success" as const,
    message:
      "If the address can receive verification for this account, a new link will arrive shortly.",
  };

  const rateLimit = await consumeSecurityRateLimit(
    {
      type: "EMAIL_VERIFICATION_RESEND",
      subject: parsed.data.email,
      maxAttempts: 3,
      windowMs: 1000 * 60 * 30,
    },
    database,
  );

  if (!rateLimit.allowed) {
    return {
      status: "error",
      message: "Too many requests. Try again later.",
    };
  }

  const user = await database.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user || user.emailVerified) {
    return genericSuccess;
  }

  try {
    const verificationToken = await issueEmailVerificationToken(user.id, database);
    await sendEmail(buildVerificationEmail(user.email, verificationToken));
  } catch (error) {
    logError(error, "verification.resend");
    return {
      status: "error",
      message: "We couldn't send a new verification link. Try again.",
    };
  }

  audit({
    action: "auth.verification_resent",
    userId: user.id,
  });

  return genericSuccess;
}

export async function verifyEmailAddress(
  input: {
    email: string | undefined;
    token: string | undefined;
  },
  options: {
    database?: VerificationDatabase;
    audit?: typeof logAuditEvent;
  } = {},
): Promise<VerificationActionState> {
  if (!input.email || !input.token) {
    return {
      status: "error",
      message: "This verification link is incomplete.",
    };
  }

  const database = options.database ?? db;
  const audit = options.audit ?? logAuditEvent;
  const tokenHash = hashToken(input.token);
  const verificationToken = await database.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });

  if (
    !verificationToken ||
    verificationToken.expiresAt <= new Date() ||
    verificationToken.user.email !== input.email
  ) {
    return {
      status: "error",
      message: "This verification link is invalid or has expired.",
    };
  }

  await database.user.update({
    where: { id: verificationToken.userId },
    data: {
      emailVerified: new Date(),
    },
  });

  await database.emailVerificationToken.deleteMany({
    where: { userId: verificationToken.userId },
  });

  audit({
    action: "auth.email_verified",
    userId: verificationToken.userId,
  });

  return {
    status: "success",
    message: "Email verified. You can sign in now.",
  };
}
