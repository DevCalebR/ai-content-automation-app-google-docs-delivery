import type { IntegrationConnection } from "@prisma/client";
import {
  googleDocsConnectionStateSchema,
  type GoogleDocsAuthMode,
  type GoogleDocsConnectionState,
  googleDocsConnectionMetadataSchema,
  type GoogleDocsConnectionMetadata,
} from "@/lib/validations/google-docs";
import { formatShortDate } from "@/lib/utils";

type GoogleDocsConnectionRecord = Pick<
  IntegrationConnection,
  "status" | "metadata" | "encryptedAccessToken" | "encryptedRefreshToken"
>;

export function getGoogleDocsConnectionState(
  connection: Pick<IntegrationConnection, "status" | "metadata"> | null,
): GoogleDocsConnectionState | null {
  if (!connection?.metadata) {
    return null;
  }

  const parsed = googleDocsConnectionStateSchema.safeParse(connection.metadata);

  if (!parsed.success) {
    return null;
  }

  if (parsed.data.authMode || !parsed.data.folderId) {
    return parsed.data;
  }

  return {
    ...parsed.data,
    authMode: "SERVICE_ACCOUNT",
  };
}

export function getGoogleDocsConnectionMetadata(
  connection: Pick<IntegrationConnection, "status" | "metadata"> | null,
): GoogleDocsConnectionMetadata | null {
  if (!connection || connection.status !== "CONNECTED") {
    return null;
  }

  const state = getGoogleDocsConnectionState(connection);

  if (!state?.folderId || !state.configuredAt) {
    return null;
  }

  const parsed = googleDocsConnectionMetadataSchema.safeParse({
    ...state,
    authMode: state.authMode ?? "SERVICE_ACCOUNT",
  });

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function hasGoogleDocsOAuthConnection(connection: GoogleDocsConnectionRecord | null) {
  return Boolean(connection?.encryptedAccessToken || connection?.encryptedRefreshToken);
}

export function hasGoogleDocsOAuthRefreshToken(connection: GoogleDocsConnectionRecord | null) {
  return Boolean(connection?.encryptedRefreshToken);
}

export function mergeGoogleDocsConnectionState(
  existingState: GoogleDocsConnectionState | null,
  updates: Partial<GoogleDocsConnectionState> & { authMode?: GoogleDocsAuthMode },
) {
  return Object.fromEntries(
    Object.entries({
      ...(existingState ?? {}),
      ...updates,
    }).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as GoogleDocsConnectionState;
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
