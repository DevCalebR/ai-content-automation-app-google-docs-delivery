"use client";

import { useActionState } from "react";
import type { Workspace } from "@prisma/client";
import { updateWorkspaceSettingsAction } from "@/app/(app)/app/actions";
import { FormStateMessage } from "@/components/ui/form-state";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

const initialState = {
  status: "idle" as const,
};

export function WorkspaceSettingsForm({ workspace }: { workspace: Workspace }) {
  const [state, formAction] = useActionState(updateWorkspaceSettingsAction, initialState);

  return (
    <form className="space-y-5" action={formAction}>
      <input type="hidden" name="workspaceId" value={workspace.id} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="name">
          Workspace name
        </label>
        <Input defaultValue={workspace.name} id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="description">
          Description
        </label>
        <Textarea defaultValue={workspace.description ?? ""} id="description" name="description" />
      </div>
      <FormStateMessage state={state} />
      <SubmitButton pendingLabel="Saving settings...">Save workspace settings</SubmitButton>
    </form>
  );
}
