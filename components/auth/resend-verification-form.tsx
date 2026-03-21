"use client";

import { useActionState } from "react";
import { resendVerificationAction } from "@/app/(auth)/actions";
import { FormStateMessage } from "@/components/ui/form-state";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState = {
  status: "idle" as const,
};

export function ResendVerificationForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction] = useActionState(resendVerificationAction, initialState);

  return (
    <form className="space-y-4" action={formAction}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="email">
          Work email
        </label>
        <Input defaultValue={defaultEmail} id="email" name="email" type="email" required />
      </div>
      <FormStateMessage state={state} />
      <SubmitButton className="w-full" pendingLabel="Sending link...">
        Resend verification email
      </SubmitButton>
    </form>
  );
}
