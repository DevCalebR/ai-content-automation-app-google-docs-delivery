"use client";

import { useActionState } from "react";
import { saveGoogleDocsConnectionAction } from "@/app/(app)/app/actions";
import { FormStateMessage } from "@/components/ui/form-state";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export function GoogleDocsSettingsForm({
  workspaceId,
  initialFolderId,
  initialTitlePrefix,
  serviceAccountEmail,
  serverReady,
}: {
  workspaceId: string;
  initialFolderId?: string;
  initialTitlePrefix?: string;
  serviceAccountEmail?: string | null;
  serverReady: boolean;
}) {
  const [state, formAction] = useActionState(saveGoogleDocsConnectionAction, {
    status: "idle" as const,
    values: {
      folderId: initialFolderId ?? "",
      titlePrefix: initialTitlePrefix ?? "",
    },
  });

  return (
    <form action={formAction} className="space-y-5">
      <input name="workspaceId" type="hidden" value={workspaceId} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="folderId">
          Shared Google Drive folder ID
        </label>
        <Input
          defaultValue={state.values.folderId}
          disabled={!serverReady}
          id="folderId"
          name="folderId"
          placeholder="1AbCdEfGhIjKlMnOpQrStUvWxYz"
          required
        />
        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          Share a Drive folder with
          {" "}
          <span className="font-medium text-[var(--ink)]">
            {serviceAccountEmail ?? "your workspace delivery service account"}
          </span>
          {" "}
          and paste the folder ID here.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="titlePrefix">
          Document title prefix
        </label>
        <Input
          defaultValue={state.values.titlePrefix}
          disabled={!serverReady}
          id="titlePrefix"
          name="titlePrefix"
          placeholder="North Star Media"
        />
      </div>

      {!serverReady ? (
        <p className="text-sm text-[var(--ink-soft)]">
          Google Docs delivery becomes available after the server has a Google service account
          email and private key configured.
        </p>
      ) : null}

      <FormStateMessage state={state} />
      <SubmitButton disabled={!serverReady} pendingLabel="Saving delivery settings...">
        Save Google Docs delivery settings
      </SubmitButton>
    </form>
  );
}
