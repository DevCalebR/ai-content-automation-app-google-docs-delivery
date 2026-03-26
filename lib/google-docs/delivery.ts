import "server-only";

import type { StructuredOutput } from "@prisma/client";
import { createGoogleDocsDelivery } from "@/lib/google-docs/service";
import { buildGoogleDocsDocumentTitle } from "@/lib/google-docs/connection";
import type { GoogleDocsConnectionMetadata } from "@/lib/validations/google-docs";
import type { GoogleDocsApiClients } from "@/lib/google-docs/client";
import { buildRunExportContent } from "@/lib/results/format";

export async function deliverStructuredOutputToGoogleDocs(input: {
  businessName: string;
  createdAt: Date;
  model: string;
  workspaceName?: string;
  output: Pick<
    StructuredOutput,
    | "campaignSummary"
    | "calendarEntries"
    | "captions"
    | "hashtags"
    | "imagePrompts"
  >;
  connectionMetadata: GoogleDocsConnectionMetadata;
  clients?: GoogleDocsApiClients;
}) {
  const exportContent = buildRunExportContent({
    businessName: input.businessName,
    createdAt: input.createdAt,
    model: input.model,
    workspaceName: input.workspaceName,
    output: input.output,
  });

  const title = buildGoogleDocsDocumentTitle({
    businessName: input.businessName,
    createdAt: input.createdAt,
    titlePrefix: input.connectionMetadata.titlePrefix,
  });

  return createGoogleDocsDelivery({
    title,
    folderId: input.connectionMetadata.folderId,
    blocks: exportContent.googleDocBlocks,
    authMode: input.connectionMetadata.authMode,
    docsClient: input.clients?.docs,
    driveClient: input.clients?.drive,
  });
}
