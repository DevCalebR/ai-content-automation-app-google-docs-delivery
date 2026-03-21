"use server";

import { redirect } from "next/navigation";
import { registerUser } from "@/lib/auth/register";

export type RegisterState =
  | {
      status: "idle";
      message?: string;
    }
  | {
      status: "error";
      message: string;
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
    return result;
  }

  redirect(result.redirectTo);
}
