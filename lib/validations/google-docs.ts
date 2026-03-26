import { z } from "zod";

export const googleDocsSettingsFieldNames = [
  "folderId",
  "titlePrefix",
] as const;

export type GoogleDocsSettingsFieldName =
  (typeof googleDocsSettingsFieldNames)[number];

export type GoogleDocsSettingsFieldErrors = Partial<
  Record<GoogleDocsSettingsFieldName, string>
>;

export const googleDocsAuthModeSchema = z.enum([
  "SERVICE_ACCOUNT",
  "USER_OAUTH",
]);

export const googleDocsConnectionFormSchema = z.object({
  workspaceId: z.string().min(1),
  authMode: googleDocsAuthModeSchema.default("SERVICE_ACCOUNT"),
  folderId: z.string().trim().min(1, "Enter a Google Drive folder ID."),
  titlePrefix: z
    .string()
    .trim()
    .max(80, "Keep the document title prefix under 80 characters.")
    .optional(),
});

export const googleDocsDeliveryRequestSchema = z.object({
  workspaceId: z.string().min(1),
  runId: z.string().min(1),
});

export const googleDocsConnectionStateSchema = z.object({
  authMode: googleDocsAuthModeSchema.optional(),
  folderId: z.string().min(1).optional(),
  folderName: z.string().optional(),
  titlePrefix: z.string().optional(),
  configuredAt: z.string().datetime().optional(),
  oauthConnectedAt: z.string().datetime().optional(),
});

export const googleDocsConnectionMetadataSchema =
  googleDocsConnectionStateSchema.extend({
    authMode: googleDocsAuthModeSchema,
    folderId: z.string().min(1),
    configuredAt: z.string().datetime(),
  });

export type GoogleDocsAuthMode = z.infer<typeof googleDocsAuthModeSchema>;
export type GoogleDocsConnectionState = z.infer<
  typeof googleDocsConnectionStateSchema
>;
export type GoogleDocsConnectionMetadata = z.infer<
  typeof googleDocsConnectionMetadataSchema
>;

export function getGoogleDocsSettingsFieldErrors(
  error: z.ZodError<z.infer<typeof googleDocsConnectionFormSchema>>,
): GoogleDocsSettingsFieldErrors {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: GoogleDocsSettingsFieldErrors = {};

  for (const fieldName of googleDocsSettingsFieldNames) {
    const message = flattened[fieldName]?.[0];

    if (message) {
      fieldErrors[fieldName] = message;
    }
  }

  return fieldErrors;
}
