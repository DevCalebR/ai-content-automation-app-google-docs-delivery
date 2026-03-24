"use server";

import { redirect } from "next/navigation";
import { registerUser } from "@/lib/auth/register";
import { resendVerificationEmail } from "@/lib/auth/email-verification";
import { requestPasswordReset, resetPassword } from "@/lib/auth/password-reset";
import type { ActionState } from "@/components/ui/form-state";
import type { RegisterFieldErrors, RegisterSafeValues } from "@/lib/validations/auth";

export type RegisterState =
  | {
      status: "idle";
      message?: string;
      values: RegisterSafeValues;
      fieldErrors: RegisterFieldErrors;
      submissionId: number;
    }
  | {
      status: "error";
      message: string;
      values: RegisterSafeValues;
      fieldErrors: RegisterFieldErrors;
      submissionId: number;
    };

export async function registerUserAction(
  prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  void prevState;

  const result = await registerUser({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (result.status === "error") {
    return {
      ...result,
      submissionId: (prevState.submissionId ?? 0) + 1,
    };
  }

  redirect(result.redirectTo);
}

const idleState: ActionState = {
  status: "idle",
};

export async function resendVerificationAction(
  prevState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  void prevState;

  return resendVerificationEmail({
    email: formData.get("email"),
  });
}

export async function requestPasswordResetAction(
  prevState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  void prevState;

  return requestPasswordReset({
    email: formData.get("email"),
  });
}

export async function resetPasswordAction(
  prevState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  void prevState;

  const result = await resetPassword({
    email: formData.get("email"),
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (result.status === "success" && result.redirectTo) {
    redirect(result.redirectTo);
  }

  return result;
}
