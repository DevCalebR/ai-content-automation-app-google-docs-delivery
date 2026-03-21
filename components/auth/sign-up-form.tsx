"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerUserAction, type RegisterState } from "@/app/(auth)/actions";
import { FormStateMessage } from "@/components/ui/form-state";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: RegisterState = {
  status: "idle" as const,
};

export function SignUpForm() {
  const [state, formAction] = useActionState(registerUserAction, initialState);

  return (
    <form className="space-y-4" action={formAction}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="name">
          Full name
        </label>
        <Input id="name" name="name" placeholder="Caleb Porter" required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="email">
          Work email
        </label>
        <Input id="email" name="email" type="email" placeholder="operator@company.com" required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="password">
          Password
        </label>
        <Input id="password" name="password" type="password" required />
      </div>
      <FormStateMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingLabel="Creating account...">
        Create account
      </SubmitButton>
      <p className="text-sm text-[var(--ink-soft)]">
        Already have an account?{" "}
        <Link className="font-medium text-[var(--ink)]" href="/sign-in">
          Sign in
        </Link>
      </p>
    </form>
  );
}
