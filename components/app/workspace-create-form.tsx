"use client";

import { useActionState } from "react";
import { createWorkspaceAction } from "@/app/(app)/app/actions";
import { FormStateMessage } from "@/components/ui/form-state";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

const initialState = {
  status: "idle" as const,
};

export function WorkspaceCreateForm() {
  const [state, formAction] = useActionState(createWorkspaceAction, initialState);

  return (
    <form className="space-y-5" action={formAction}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="name">
          Workspace name
        </label>
        <Input id="name" name="name" placeholder="North Star Media" required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="description">
          Short description
        </label>
        <Textarea
          id="description"
          name="description"
          placeholder="Who this workspace serves, what the offer is, and how the team uses content."
        />
      </div>
      <FormStateMessage state={state} />
      <SubmitButton pendingLabel="Creating workspace...">Create workspace</SubmitButton>
    </form>
  );
}
