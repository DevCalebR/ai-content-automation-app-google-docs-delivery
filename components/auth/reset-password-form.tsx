"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { FormStateMessage } from "@/components/ui/form-state";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState = {
  status: "idle" as const,
};

export function ResetPasswordForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  return (
    <form className="space-y-4" action={formAction}>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="password">
          New password
        </label>
        <Input id="password" name="password" type="password" required />
      </div>
      <FormStateMessage state={state} />
      <SubmitButton className="w-full" pendingLabel="Updating password...">
        Set new password
      </SubmitButton>
    </form>
  );
}
