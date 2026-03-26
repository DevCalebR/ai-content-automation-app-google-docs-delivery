"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Workspace } from "@prisma/client";
import { updateWorkspaceSettingsAction } from "@/app/(app)/app/actions";
import {
  FieldErrorMessage,
  FormStateMessage,
} from "@/components/ui/form-state";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  buildWorkspaceFormValues,
  createInitialWorkspaceState,
  getFirstWorkspaceErrorField,
  type WorkspaceFormFieldName,
} from "@/lib/validations/workspace";

const invalidFieldClassName =
  "border-[var(--danger)] focus:border-[var(--danger)]";

export function WorkspaceSettingsForm({ workspace }: { workspace: Workspace }) {
  const [state, formAction] = useActionState(
    updateWorkspaceSettingsAction,
    createInitialWorkspaceState(
      buildWorkspaceFormValues({
        workspaceId: workspace.id,
        name: workspace.name,
        description: workspace.description ?? "",
      }),
    ),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const firstErrorField = getFirstWorkspaceErrorField(state.fieldErrors);
  const formKey = `workspace-settings-form-${workspace.id}-${state.submissionId}`;

  useEffect(() => {
    if (state.status !== "error" || !firstErrorField) {
      return;
    }

    const field = formRef.current?.elements.namedItem(firstErrorField);

    if (field instanceof HTMLElement) {
      field.focus();
    }
  }, [firstErrorField, state.status, state.submissionId]);

  function getFieldError(fieldName: WorkspaceFormFieldName) {
    return state.fieldErrors[fieldName];
  }

  function getFieldProps(fieldName: WorkspaceFormFieldName) {
    const errorMessage = getFieldError(fieldName);

    return {
      "aria-describedby": errorMessage ? `${fieldName}-error` : undefined,
      "aria-invalid": Boolean(errorMessage),
      className: errorMessage ? invalidFieldClassName : undefined,
    };
  }

  return (
    <form key={formKey} action={formAction} className="space-y-5" ref={formRef}>
      <input
        type="hidden"
        name="workspaceId"
        value={state.values.workspaceId}
      />
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-[var(--ink-soft)]"
          htmlFor="name"
        >
          Workspace name
        </label>
        <Input
          defaultValue={state.values.name}
          id="name"
          name="name"
          required
          {...getFieldProps("name")}
        />
        <FieldErrorMessage id="name-error" message={getFieldError("name")} />
      </div>
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-[var(--ink-soft)]"
          htmlFor="description"
        >
          Description
        </label>
        <Textarea
          defaultValue={state.values.description}
          id="description"
          name="description"
          {...getFieldProps("description")}
        />
        <FieldErrorMessage
          id="description-error"
          message={getFieldError("description")}
        />
        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          Update how this workspace should be described anywhere your team opens
          it.
        </p>
      </div>
      <FormStateMessage state={state} />
      <SubmitButton pendingLabel="Saving settings...">
        Save workspace settings
      </SubmitButton>
    </form>
  );
}
