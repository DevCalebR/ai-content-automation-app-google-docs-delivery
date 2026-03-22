import "server-only";

import { getGoogleDocsClient, getGoogleDriveClient } from "@/lib/google-docs/client";

type GoogleDocBlock = {
  kind: "title" | "subtitle" | "heading" | "body";
  text: string;
};

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

export async function validateGoogleDocsFolderAccess(folderId: string) {
  const drive = getGoogleDriveClient();
  const response = await drive.files.get({
    fileId: folderId,
    fields: "id,name,mimeType",
    supportsAllDrives: true,
  });

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
}) {
  const docs = getGoogleDocsClient();
  const drive = getGoogleDriveClient();
  const createdDocument = await docs.documents.create({
    requestBody: {
      title: input.title,
    },
  });
  const documentId = createdDocument.data.documentId;

  if (!documentId) {
    throw new Error("Google Docs did not return a document id.");
  }

  const requests = buildGoogleDocsRequests(input.blocks);

  if (requests.length) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });
  }

  const existingFile = await drive.files.get({
    fileId: documentId,
    fields: "parents,webViewLink",
    supportsAllDrives: true,
  });

  const updatedFile = await drive.files.update({
    fileId: documentId,
    addParents: input.folderId,
    removeParents: existingFile.data.parents?.join(",") || undefined,
    fields: "id,webViewLink",
    supportsAllDrives: true,
  });

  return {
    documentId,
    title: input.title,
    url:
      updatedFile.data.webViewLink ??
      existingFile.data.webViewLink ??
      `https://docs.google.com/document/d/${documentId}/edit`,
  };
}
