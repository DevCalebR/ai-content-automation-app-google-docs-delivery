import "server-only";

import type { docs_v1, drive_v3 } from "googleapis";
import { getGoogleDocsClient, getGoogleDriveClient } from "@/lib/google-docs/client";
import type { GoogleDocsAuthMode } from "@/lib/validations/google-docs";

type GoogleDocBlock = {
  kind: "title" | "subtitle" | "heading" | "body";
  text: string;
};

export type GoogleDocsDeliveryStage =
  | "folder_validation"
  | "document_creation"
  | "document_content"
  | "document_move";

export type GoogleDocsDeliveryErrorKind =
  | "not_found"
  | "permission"
  | "configuration"
  | "unknown";

type GoogleDocsServiceOptions = {
  authMode?: GoogleDocsAuthMode;
  docsClient?: docs_v1.Docs;
  driveClient?: drive_v3.Drive;
};

type GoogleApiError = Error & {
  code?: number;
  status?: number;
  response?: {
    status?: number;
    data?: {
      error?: {
        status?: string;
        message?: string;
        errors?: Array<{
          reason?: string;
          message?: string;
        }>;
      };
    };
  };
};

export class GoogleDocsDeliveryError extends Error {
  readonly stage: GoogleDocsDeliveryStage;
  readonly kind: GoogleDocsDeliveryErrorKind;
  readonly details?: {
    status: number | null;
    apiMessage: string | null;
    apiReason: string | null;
  };

  constructor(input: {
    stage: GoogleDocsDeliveryStage;
    kind: GoogleDocsDeliveryErrorKind;
    message: string;
    details?: {
      status: number | null;
      apiMessage: string | null;
      apiReason: string | null;
    };
  }) {
    super(input.message);
    this.name = "GoogleDocsDeliveryError";
    this.stage = input.stage;
    this.kind = input.kind;
    this.details = input.details;
  }
}

function getNamedStyleType(kind: GoogleDocBlock["kind"]) {
  switch (kind) {
    case "title":
      return "TITLE";
    case "subtitle":
      return "SUBTITLE";
    case "heading":
      return "HEADING_1";
    default:
      return null;
  }
}

function buildGoogleDocsRequests(blocks: GoogleDocBlock[]) {
  const requests: Array<Record<string, unknown>> = [];
  let index = 1;

  for (const block of blocks) {
    const text = block.text.trim();

    if (!text) {
      continue;
    }

    const insertedText = `${text}\n\n`;
    const blockStart = index;
    const style = getNamedStyleType(block.kind);

    requests.push({
      insertText: {
        location: { index: blockStart },
        text: insertedText,
      },
    });

    if (style) {
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: blockStart,
            endIndex: blockStart + text.length + 1,
          },
          paragraphStyle: {
            namedStyleType: style,
          },
          fields: "namedStyleType",
        },
      });
    }

    index += insertedText.length;
  }

  return requests;
}

function getGoogleApiStatus(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const googleError = error as GoogleApiError;

  return googleError.status ?? googleError.code ?? googleError.response?.status ?? null;
}

function getGoogleApiMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const googleError = error as GoogleApiError;

  return googleError.response?.data?.error?.message ?? null;
}

function getGoogleApiReason(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const googleError = error as GoogleApiError;

  return googleError.response?.data?.error?.errors?.[0]?.reason ?? null;
}

function getGoogleApiDetails(error: unknown) {
  return {
    status: getGoogleApiStatus(error),
    apiMessage: getGoogleApiMessage(error),
    apiReason: getGoogleApiReason(error),
  };
}

function isGoogleDocsConfigurationError(apiMessage: string) {
  return (
    apiMessage.includes("invalid grant") ||
    apiMessage.includes("invalid_grant") ||
    apiMessage.includes("private key") ||
    apiMessage.includes("jwt") ||
    apiMessage.includes("credentials") ||
    apiMessage.includes("unauthenticated") ||
    apiMessage.includes("unauthorized")
  );
}

function isGoogleApiEnablementError(apiMessage: string, apiReason: string) {
  return (
    apiReason.includes("servicedisabled") ||
    apiMessage.includes("api has not been used") ||
    apiMessage.includes("api is not enabled") ||
    apiMessage.includes("service has not been used") ||
    apiMessage.includes("access not configured") ||
    apiMessage.includes("service disabled")
  );
}

function isGoogleApiPermissionError(status: number | null, apiMessage: string, apiReason: string) {
  return (
    status === 403 ||
    apiReason.includes("forbidden") ||
    apiMessage.includes("caller does not have permission") ||
    apiMessage.includes("does not have permission")
  );
}

function buildGoogleDocsDeliveryError(input: {
  stage: GoogleDocsDeliveryStage;
  kind: GoogleDocsDeliveryErrorKind;
  message: string;
  details?: {
    status: number | null;
    apiMessage: string | null;
    apiReason: string | null;
  };
}) {
  return new GoogleDocsDeliveryError(input);
}

export function isGoogleDocsDeliveryError(error: unknown): error is GoogleDocsDeliveryError {
  return error instanceof GoogleDocsDeliveryError;
}

function isUserOAuthMode(authMode: GoogleDocsAuthMode) {
  return authMode === "USER_OAUTH";
}

function mapGoogleDocsFolderAccessError(
  error: unknown,
  authMode: GoogleDocsAuthMode = "SERVICE_ACCOUNT",
) {
  const status = getGoogleApiStatus(error);
  const apiMessage = getGoogleApiMessage(error)?.toLowerCase() ?? "";
  const apiReason = getGoogleApiReason(error)?.toLowerCase() ?? "";
  const details = getGoogleApiDetails(error);
  const usingUserOAuth = isUserOAuthMode(authMode);

  if (isGoogleApiEnablementError(apiMessage, apiReason)) {
    return buildGoogleDocsDeliveryError({
      stage: "folder_validation",
      kind: "configuration",
      message:
        usingUserOAuth
          ? "Google Drive access is not configured correctly for this workspace’s connected Google account. Reconnect Google Docs delivery and try again."
          : "Google Drive API is not enabled for the delivery service account project. Enable the Google Drive API and try again.",
      details,
    });
  }

  if (status === 404 || apiMessage.includes("file not found")) {
    return buildGoogleDocsDeliveryError({
      stage: "folder_validation",
      kind: "not_found",
      message:
        usingUserOAuth
          ? "We couldn’t find that Google Drive folder. Check the folder ID and confirm the connected Google account can open it."
          : "We couldn’t find that Google Drive folder. Check the folder ID and confirm the folder is shared with the delivery service account.",
      details,
    });
  }

  if (
    status === 401 ||
    status === 403 ||
    apiMessage.includes("insufficient") ||
    apiMessage.includes("permission")
  ) {
    return buildGoogleDocsDeliveryError({
      stage: "folder_validation",
      kind: "permission",
      message:
        usingUserOAuth
          ? "The connected Google account can’t access that Google Drive folder yet. Choose a folder this account can edit, then try again."
          : "The delivery service account can’t access that Google Drive folder yet. Share the folder with the service account as an Editor, then try again.",
      details,
    });
  }

  return buildGoogleDocsDeliveryError({
    stage: "folder_validation",
    kind: "configuration",
    message:
      usingUserOAuth
        ? "We couldn’t verify that Google Drive folder right now. Reconnect the Google account and try again."
        : "We couldn’t verify that Google Drive folder right now. Confirm the server credentials are valid and try again.",
    details,
  });
}

function mapGoogleDocsDocumentCreationError(
  error: unknown,
  authMode: GoogleDocsAuthMode = "SERVICE_ACCOUNT",
) {
  const status = getGoogleApiStatus(error);
  const apiMessage = getGoogleApiMessage(error)?.toLowerCase() ?? "";
  const apiReason = getGoogleApiReason(error)?.toLowerCase() ?? "";
  const details = getGoogleApiDetails(error);
  const usingUserOAuth = isUserOAuthMode(authMode);

  if (isGoogleApiEnablementError(apiMessage, apiReason)) {
    return buildGoogleDocsDeliveryError({
      stage: "document_creation",
      kind: "configuration",
      message:
        usingUserOAuth
          ? "Google Docs access is not configured correctly for this workspace’s connected Google account. Reconnect Google Docs delivery and try again."
          : "Google Docs API is not enabled for the delivery service account project. Enable the Google Docs API and try again.",
      details,
    });
  }

  if (isGoogleApiPermissionError(status, apiMessage, apiReason)) {
    return buildGoogleDocsDeliveryError({
      stage: "document_creation",
      kind: "permission",
      message:
        usingUserOAuth
          ? "Google Docs rejected document creation for the connected Google account. Confirm that account can create Docs in the selected folder and try again."
          : "Google Docs rejected document creation for this service account. Confirm the Google Docs API is enabled for the project and that the service account is allowed to create documents.",
      details,
    });
  }

  if (isGoogleDocsConfigurationError(apiMessage)) {
    return buildGoogleDocsDeliveryError({
      stage: "document_creation",
      kind: "configuration",
      message:
        usingUserOAuth
          ? "Google Docs delivery is not configured correctly for the connected Google account. Reconnect Google Docs delivery and try again."
          : "Google Docs delivery is not configured correctly on the server. Check the service account credentials and try again.",
      details,
    });
  }

  return buildGoogleDocsDeliveryError({
    stage: "document_creation",
    kind: "unknown",
    message: "Google Docs couldn’t create a document for this run. Try again in a moment.",
    details,
  });
}

function mapGoogleDocsDocumentContentError(
  error: unknown,
  authMode: GoogleDocsAuthMode = "SERVICE_ACCOUNT",
) {
  const apiMessage = getGoogleApiMessage(error)?.toLowerCase() ?? "";
  const apiReason = getGoogleApiReason(error)?.toLowerCase() ?? "";
  const details = getGoogleApiDetails(error);
  const usingUserOAuth = isUserOAuthMode(authMode);

  if (isGoogleApiEnablementError(apiMessage, apiReason)) {
    return buildGoogleDocsDeliveryError({
      stage: "document_content",
      kind: "configuration",
      message:
        usingUserOAuth
          ? "Google Docs access is not configured correctly for this workspace’s connected Google account. Reconnect Google Docs delivery and try again."
          : "Google Docs API is not enabled for the delivery service account project. Enable the Google Docs API and try again.",
      details,
    });
  }

  if (isGoogleDocsConfigurationError(apiMessage)) {
    return buildGoogleDocsDeliveryError({
      stage: "document_content",
      kind: "configuration",
      message:
        usingUserOAuth
          ? "Google Docs delivery is not configured correctly for the connected Google account. Reconnect Google Docs delivery and try again."
          : "Google Docs delivery is not configured correctly on the server. Check the service account credentials and try again.",
      details,
    });
  }

  return buildGoogleDocsDeliveryError({
    stage: "document_content",
    kind: "unknown",
    message:
      "Google Docs created the document, but couldn’t write the formatted content. Try delivering the run again.",
    details,
  });
}

function mapGoogleDocsDocumentMoveError(
  error: unknown,
  authMode: GoogleDocsAuthMode = "SERVICE_ACCOUNT",
) {
  const status = getGoogleApiStatus(error);
  const apiMessage = getGoogleApiMessage(error)?.toLowerCase() ?? "";
  const apiReason = getGoogleApiReason(error)?.toLowerCase() ?? "";
  const details = getGoogleApiDetails(error);
  const usingUserOAuth = isUserOAuthMode(authMode);

  if (isGoogleApiEnablementError(apiMessage, apiReason)) {
    return buildGoogleDocsDeliveryError({
      stage: "document_move",
      kind: "configuration",
      message:
        usingUserOAuth
          ? "Google Drive access is not configured correctly for this workspace’s connected Google account. Reconnect Google Docs delivery and try again."
          : "Google Drive API is not enabled for the delivery service account project. Enable the Google Drive API and try again.",
      details,
    });
  }

  if (status === 404 || apiMessage.includes("file not found")) {
    return buildGoogleDocsDeliveryError({
      stage: "document_move",
      kind: "not_found",
      message:
        usingUserOAuth
          ? "Google Docs created the document, but couldn’t find the configured Drive folder. Confirm the selected folder still exists and try again."
          : "Google Docs created the document, but couldn’t find the configured Drive folder. Confirm the folder ID is still correct and shared with the delivery service account.",
      details,
    });
  }

  if (
    status === 401 ||
    status === 403 ||
    apiMessage.includes("insufficient") ||
    apiMessage.includes("permission")
  ) {
    return buildGoogleDocsDeliveryError({
      stage: "document_move",
      kind: "permission",
      message:
        usingUserOAuth
          ? "Google Docs created the document, but the connected Google account can’t move it into that Drive folder. Confirm the folder permissions and try again."
          : "Google Docs created the document, but the delivery service account can’t add it to that Drive folder. Share the folder with the service account as an Editor, then try again.",
      details,
    });
  }

  if (isGoogleDocsConfigurationError(apiMessage)) {
    return buildGoogleDocsDeliveryError({
      stage: "document_move",
      kind: "configuration",
      message:
        usingUserOAuth
          ? "Google Docs delivery is not configured correctly for the connected Google account. Reconnect Google Docs delivery and try again."
          : "Google Docs delivery is not configured correctly on the server. Check the service account credentials and try again.",
      details,
    });
  }

  return buildGoogleDocsDeliveryError({
    stage: "document_move",
    kind: "unknown",
    message:
      "Google Docs created the document, but couldn’t place it in the configured Drive folder. Try again in a moment.",
    details,
  });
}

export async function validateGoogleDocsFolderAccess(
  folderId: string,
  options: Pick<GoogleDocsServiceOptions, "authMode" | "driveClient"> = {},
) {
  const authMode = options.authMode ?? "SERVICE_ACCOUNT";
  const drive = options.driveClient ?? getGoogleDriveClient();
  let response;

  try {
    response = await drive.files.get({
      fileId: folderId,
      fields: "id,name,mimeType,driveId",
      supportsAllDrives: true,
    });
  } catch (error) {
    throw mapGoogleDocsFolderAccessError(error, authMode);
  }

  if (response.data.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error("The Google Drive location must be a folder.");
  }

  return {
    folderId: response.data.id ?? folderId,
    folderName: response.data.name ?? "Shared folder",
  };
}

export async function createGoogleDocsDelivery(input: {
  title: string;
  folderId: string;
  blocks: GoogleDocBlock[];
  authMode?: GoogleDocsAuthMode;
  docsClient?: docs_v1.Docs;
  driveClient?: drive_v3.Drive;
}) {
  const authMode = input.authMode ?? "SERVICE_ACCOUNT";
  const docs = input.docsClient ?? getGoogleDocsClient();
  const drive = input.driveClient ?? getGoogleDriveClient();
  let createdDocument;
  let createdFile;

  if (authMode === "USER_OAUTH") {
    try {
      createdFile = await drive.files.create({
        requestBody: {
          name: input.title,
          mimeType: "application/vnd.google-apps.document",
          parents: [input.folderId],
        },
        fields: "id,webViewLink",
        supportsAllDrives: true,
      });
    } catch (error) {
      throw mapGoogleDocsDocumentCreationError(error, authMode);
    }

    const documentId = createdFile.data.id;

    if (!documentId) {
      throw buildGoogleDocsDeliveryError({
        stage: "document_creation",
        kind: "unknown",
        message: "Google Drive did not return a document id.",
      });
    }

    const requests = buildGoogleDocsRequests(input.blocks);

    if (requests.length) {
      try {
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests,
          },
        });
      } catch (error) {
        throw mapGoogleDocsDocumentContentError(error, authMode);
      }
    }

    return {
      documentId,
      title: input.title,
      url:
        createdFile.data.webViewLink ??
        `https://docs.google.com/document/d/${documentId}/edit`,
    };
  }

  try {
    createdDocument = await docs.documents.create({
      requestBody: {
        title: input.title,
      },
    });
  } catch (error) {
    throw mapGoogleDocsDocumentCreationError(error, authMode);
  }

  const documentId = createdDocument.data.documentId;

  if (!documentId) {
    throw buildGoogleDocsDeliveryError({
      stage: "document_creation",
      kind: "unknown",
      message: "Google Docs did not return a document id.",
    });
  }

  const requests = buildGoogleDocsRequests(input.blocks);

  if (requests.length) {
    try {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests,
        },
      });
    } catch (error) {
      throw mapGoogleDocsDocumentContentError(error, authMode);
    }
  }

  let existingFile;
  let updatedFile;

  try {
    existingFile = await drive.files.get({
      fileId: documentId,
      fields: "parents,webViewLink",
      supportsAllDrives: true,
    });

    updatedFile = await drive.files.update({
      fileId: documentId,
      addParents: input.folderId,
      removeParents: existingFile.data.parents?.join(",") || undefined,
      fields: "id,webViewLink",
      supportsAllDrives: true,
    });
  } catch (error) {
    throw mapGoogleDocsDocumentMoveError(error, authMode);
  }

  return {
    documentId,
    title: input.title,
    url:
      updatedFile.data.webViewLink ??
      existingFile.data.webViewLink ??
      `https://docs.google.com/document/d/${documentId}/edit`,
  };
}
