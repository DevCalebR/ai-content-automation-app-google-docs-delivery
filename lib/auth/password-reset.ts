import { hash } from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { logAuditEvent, logError } from "@/lib/logger";
import { emailOnlySchema, passwordResetSchema } from "@/lib/validations/auth";
import { consumeSecurityRateLimit } from "@/lib/auth/rate-limit";
import { hashToken, issuePasswordResetToken } from "@/lib/auth/tokens";
import { sendTransactionalEmail } from "@/lib/email/service";
import { buildPasswordResetEmail } from "@/lib/email/templates";

type PasswordResetDatabase = Pick<
  PrismaClient,
  "user" | "passwordResetToken" | "session" | "securityEvent"
>;

type PasswordResetState = {
  status: "success" | "error";
  message: string;
  redirectTo?: string;
};

export async function requestPasswordReset(
  input: {
    email: FormDataEntryValue | null;
  },
  options: {
    database?: PasswordResetDatabase;
    audit?: typeof logAuditEvent;
    sendEmail?: typeof sendTransactionalEmail;
  } = {},
): Promise<PasswordResetState> {
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
      "If an account matches that address, a password reset link will arrive shortly.",
  };

  const rateLimit = await consumeSecurityRateLimit(
    {
      type: "PASSWORD_RESET_REQUEST",
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

  if (!user || !user.emailVerified || !user.passwordHash) {
    return genericSuccess;
  }

  try {
    const token = await issuePasswordResetToken(user.id, database);
    await sendEmail(buildPasswordResetEmail(user.email, token));
  } catch (error) {
    logError(error, "password_reset.request");
    return {
      status: "error",
      message: "We couldn't send a password reset email. Try again.",
    };
  }

  audit({
    action: "auth.password_reset_requested",
    userId: user.id,
  });

  return genericSuccess;
}

export async function resetPassword(
  input: {
    email: FormDataEntryValue | null;
    token: FormDataEntryValue | null;
    password: FormDataEntryValue | null;
  },
  options: {
    database?: PasswordResetDatabase;
    hashPassword?: (password: string, rounds: number) => Promise<string>;
    audit?: typeof logAuditEvent;
  } = {},
): Promise<PasswordResetState> {
  const parsed = passwordResetSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid new password.",
    };
  }

  const database = options.database ?? db;
  const hashPassword = options.hashPassword ?? hash;
  const audit = options.audit ?? logAuditEvent;
  const tokenHash = hashToken(parsed.data.token);
  const resetToken = await database.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });

  if (
    !resetToken ||
    resetToken.expiresAt <= new Date() ||
    resetToken.user.email !== parsed.data.email
  ) {
    return {
      status: "error",
      message: "This reset link is invalid or has expired.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password, 12);

  await database.user.update({
    where: { id: resetToken.userId },
    data: {
      passwordHash,
    },
  });

  await database.passwordResetToken.deleteMany({
    where: { userId: resetToken.userId },
  });

  await database.session.deleteMany({
    where: { userId: resetToken.userId },
  });

  audit({
    action: "auth.password_reset_completed",
    userId: resetToken.userId,
  });

  return {
    status: "success",
    message: "Password updated. Sign in with your new password.",
    redirectTo: `/sign-in?reset=1&email=${encodeURIComponent(parsed.data.email)}`,
  };
}
