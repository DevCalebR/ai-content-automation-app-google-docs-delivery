import type { IntegrationConnection } from "@prisma/client";
import {
  googleDocsConnectionMetadataSchema,
  type GoogleDocsConnectionMetadata,
} from "@/lib/validations/google-docs";
import { formatShortDate } from "@/lib/utils";

export function getGoogleDocsConnectionMetadata(
  connection: Pick<IntegrationConnection, "status" | "metadata"> | null,
): GoogleDocsConnectionMetadata | null {
  if (!connection || connection.status !== "CONNECTED" || !connection.metadata) {
    return null;
  }

  const parsed = googleDocsConnectionMetadataSchema.safeParse(connection.metadata);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function buildGoogleDocsDocumentTitle(input: {
  businessName: string;
  createdAt: Date;
  titlePrefix?: string;
}) {
  const prefix = input.titlePrefix?.trim();
  const baseTitle = `${input.businessName} content plan`;

  if (!prefix) {
    return `${baseTitle} · ${formatShortDate(input.createdAt)}`;
  }

  return `${prefix} · ${baseTitle} · ${formatShortDate(input.createdAt)}`;
}
