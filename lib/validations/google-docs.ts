import { z } from "zod";

export const googleDocsAuthModeSchema = z.enum(["SERVICE_ACCOUNT", "USER_OAUTH"]);

export const googleDocsConnectionFormSchema = z.object({
  workspaceId: z.string().min(1),
  authMode: googleDocsAuthModeSchema.default("SERVICE_ACCOUNT"),
  folderId: z.string().trim().min(1, "Enter a Google Drive folder ID."),
  titlePrefix: z.string().trim().max(80).optional(),
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

export const googleDocsConnectionMetadataSchema = googleDocsConnectionStateSchema.extend({
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
