import { hash } from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/logger";
import { signUpSchema } from "@/lib/validations/auth";

type AuthDatabase = Pick<PrismaClient, "user" | "usageEvent">;

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

  const existingUser = await database.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser) {
    return {
      status: "error",
      message: "An account with this email already exists.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password, 12);

  const user = await database.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  await database.usageEvent.create({
    data: {
      userId: user.id,
      type: "AUTH_SIGN_UP",
      metadata: {
        email: user.email,
      },
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
