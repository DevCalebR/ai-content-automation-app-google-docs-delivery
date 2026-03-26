import { z } from "zod";

export const workspaceFormFieldNames = [
  "workspaceId",
  "name",
  "description",
] as const;
const workspaceEditableFieldNames = ["name", "description"] as const;

export type WorkspaceFormFieldName = (typeof workspaceFormFieldNames)[number];

export type WorkspaceFormValues = Record<WorkspaceFormFieldName, string>;

export type WorkspaceFieldErrors = Partial<
  Record<WorkspaceFormFieldName, string>
>;

export type WorkspaceFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  values: WorkspaceFormValues;
  fieldErrors: WorkspaceFieldErrors;
  submissionId: number;
};

export const workspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter a workspace name.")
    .max(80, "Keep the workspace name under 80 characters."),
  description: z
    .string()
    .trim()
    .max(280, "Keep the description under 280 characters.")
    .optional()
    .default(""),
});

function normalizeWorkspaceFormValue(
  value: FormDataEntryValue | string | null | undefined,
) {
  return typeof value === "string" ? value : "";
}

export function buildWorkspaceFormValues(
  input: Partial<
    Record<
      WorkspaceFormFieldName,
      FormDataEntryValue | string | null | undefined
    >
  >,
): WorkspaceFormValues {
  return {
    workspaceId: normalizeWorkspaceFormValue(input.workspaceId),
    name: normalizeWorkspaceFormValue(input.name),
    description: normalizeWorkspaceFormValue(input.description),
  };
}

export function createInitialWorkspaceState(
  values: WorkspaceFormValues,
): WorkspaceFormState {
  return {
    status: "idle",
    values,
    fieldErrors: {},
    submissionId: 0,
  };
}

export function getWorkspaceFieldErrors(
  error: z.ZodError<z.infer<typeof workspaceSchema>>,
): WorkspaceFieldErrors {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: WorkspaceFieldErrors = {};

  for (const fieldName of workspaceEditableFieldNames) {
    const message = flattened[fieldName]?.[0];

    if (message) {
      fieldErrors[fieldName] = message;
    }
  }

  return fieldErrors;
}

export function getFirstWorkspaceErrorField(fieldErrors: WorkspaceFieldErrors) {
  return workspaceFormFieldNames.find((fieldName) =>
    Boolean(fieldErrors[fieldName]),
  );
}
