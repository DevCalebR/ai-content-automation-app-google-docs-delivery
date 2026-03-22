import { z } from "zod";

export const googleDocsConnectionFormSchema = z.object({
  workspaceId: z.string().min(1),
  folderId: z.string().trim().min(1, "Enter a Google Drive folder ID."),
  titlePrefix: z.string().trim().max(80).optional(),
});

export const googleDocsDeliveryRequestSchema = z.object({
  workspaceId: z.string().min(1),
  runId: z.string().min(1),
});

export const googleDocsConnectionMetadataSchema = z.object({
  folderId: z.string().min(1),
  folderName: z.string().optional(),
  titlePrefix: z.string().optional(),
  configuredAt: z.string().datetime(),
});

export type GoogleDocsConnectionMetadata = z.infer<
  typeof googleDocsConnectionMetadataSchema
>;
