import "server-only";

import type { StructuredOutput } from "@prisma/client";
import { createGoogleDocsDelivery } from "@/lib/google-docs/service";
import { buildGoogleDocsDocumentTitle } from "@/lib/google-docs/connection";
import type { GoogleDocsConnectionMetadata } from "@/lib/validations/google-docs";
import { buildRunExportContent } from "@/lib/results/format";

export async function deliverStructuredOutputToGoogleDocs(input: {
  businessName: string;
  createdAt: Date;
  model: string;
  output: Pick<
    StructuredOutput,
    "campaignSummary" | "calendarEntries" | "captions" | "hashtags" | "imagePrompts"
  >;
  connectionMetadata: GoogleDocsConnectionMetadata;
}) {
  const exportContent = buildRunExportContent({
    businessName: input.businessName,
    createdAt: input.createdAt,
    model: input.model,
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
  });
}
