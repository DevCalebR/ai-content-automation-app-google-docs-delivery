"use client";

import { useActionState } from "react";
import { saveGoogleDocsConnectionAction } from "@/app/(app)/app/actions";
import { FormStateMessage } from "@/components/ui/form-state";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { GoogleDocsAuthMode } from "@/lib/validations/google-docs";

export function GoogleDocsSettingsForm({
  workspaceId,
  authMode,
  initialFolderId,
  initialTitlePrefix,
  serviceAccountEmail,
  modeReady,
  oauthConnected = false,
}: {
  workspaceId: string;
  authMode: GoogleDocsAuthMode;
  initialFolderId?: string;
  initialTitlePrefix?: string;
  serviceAccountEmail?: string | null;
  modeReady: boolean;
  oauthConnected?: boolean;
}) {
  const [state, formAction] = useActionState(saveGoogleDocsConnectionAction, {
    status: "idle" as const,
    values: {
      folderId: initialFolderId ?? "",
      titlePrefix: initialTitlePrefix ?? "",
    },
  });
  const usingUserOAuth = authMode === "USER_OAUTH";
  const isDisabled = !modeReady || (usingUserOAuth && !oauthConnected);
  const fieldLabel = usingUserOAuth
    ? "Google Drive folder ID"
    : "Shared Google Drive folder ID";
  const helperText = usingUserOAuth
    ? "Use a folder the connected Google account can edit. Completed runs will create a Google Doc directly in that folder."
    : `Share a Drive folder with ${serviceAccountEmail ?? "your workspace delivery service account"} and paste the folder ID here.`;
  const submitLabel = usingUserOAuth
    ? "Save My Drive delivery settings"
    : "Save service account delivery settings";

  return (
    <form action={formAction} className="space-y-5">
      <input name="workspaceId" type="hidden" value={workspaceId} />
      <input name="authMode" type="hidden" value={authMode} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="folderId">
          {fieldLabel}
        </label>
        <Input
          defaultValue={state.values.folderId}
          disabled={isDisabled}
          id="folderId"
          name="folderId"
          placeholder="1AbCdEfGhIjKlMnOpQrStUvWxYz"
          required
        />
        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          {helperText}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="titlePrefix">
          Document title prefix
        </label>
        <Input
          defaultValue={state.values.titlePrefix}
          disabled={isDisabled}
          id="titlePrefix"
          name="titlePrefix"
          placeholder="North Star Media"
        />
      </div>

      {!modeReady ? (
        <p className="text-sm text-[var(--ink-soft)]">
          {usingUserOAuth
            ? "Google account delivery becomes available after the server has a Google OAuth client ID and client secret configured."
            : "Google Docs delivery becomes available after the server has a Google service account email and private key configured."}
        </p>
      ) : usingUserOAuth && !oauthConnected ? (
        <p className="text-sm text-[var(--ink-soft)]">
          Connect a Google account for this workspace before saving a My Drive delivery folder.
        </p>
      ) : null}

      <FormStateMessage state={state} />
      <SubmitButton disabled={isDisabled} pendingLabel="Saving delivery settings...">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
