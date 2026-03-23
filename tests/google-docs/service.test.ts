import { beforeEach, describe, expect, it, vi } from "vitest";

const documentsCreateMock = vi.fn();
const documentsBatchUpdateMock = vi.fn();
const filesGetMock = vi.fn();
const filesUpdateMock = vi.fn();
const getGoogleDocsClientMock = vi.fn();
const getGoogleDriveClientMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/google-docs/client", () => ({
  getGoogleDocsClient: getGoogleDocsClientMock,
  getGoogleDriveClient: getGoogleDriveClientMock,
}));

describe("google docs service", () => {
  beforeEach(() => {
    documentsCreateMock.mockReset();
    documentsBatchUpdateMock.mockReset();
    filesGetMock.mockReset();
    filesUpdateMock.mockReset();
    getGoogleDocsClientMock.mockReset();
    getGoogleDriveClientMock.mockReset();

    getGoogleDocsClientMock.mockReturnValue({
      documents: {
        create: documentsCreateMock,
        batchUpdate: documentsBatchUpdateMock,
      },
    });

    getGoogleDriveClientMock.mockReturnValue({
      files: {
        get: filesGetMock,
        update: filesUpdateMock,
      },
    });
  });

  describe("validateGoogleDocsFolderAccess", () => {
    it("accepts a shared My Drive folder", async () => {
      filesGetMock.mockResolvedValue({
        data: {
          id: "folder-my-drive",
          name: "Content Delivery",
          mimeType: "application/vnd.google-apps.folder",
        },
      });

      const { validateGoogleDocsFolderAccess } = await import("@/lib/google-docs/service");
      const result = await validateGoogleDocsFolderAccess("folder-my-drive");

      expect(filesGetMock).toHaveBeenCalledWith({
        fileId: "folder-my-drive",
        fields: "id,name,mimeType,driveId",
        supportsAllDrives: true,
      });
      expect(result).toEqual({
        folderId: "folder-my-drive",
        folderName: "Content Delivery",
      });
    });

    it("accepts a shared-drive folder", async () => {
      filesGetMock.mockResolvedValue({
        data: {
          id: "folder-shared-drive",
          name: "Agency Delivery",
          mimeType: "application/vnd.google-apps.folder",
          driveId: "shared-drive-1",
        },
      });

      const { validateGoogleDocsFolderAccess } = await import("@/lib/google-docs/service");
      const result = await validateGoogleDocsFolderAccess("folder-shared-drive");

      expect(filesGetMock).toHaveBeenCalledWith({
        fileId: "folder-shared-drive",
        fields: "id,name,mimeType,driveId",
        supportsAllDrives: true,
      });
      expect(result).toEqual({
        folderId: "folder-shared-drive",
        folderName: "Agency Delivery",
      });
    });

    it("surfaces a clear message when the folder is not accessible", async () => {
      filesGetMock.mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: {
              message: "The user does not have sufficient permissions for this file.",
            },
          },
        },
      });

      const { validateGoogleDocsFolderAccess, isGoogleDocsDeliveryError } = await import(
        "@/lib/google-docs/service"
      );

      await expect(validateGoogleDocsFolderAccess("folder-private")).rejects.toMatchObject({
        message:
          "The delivery service account can’t access that Google Drive folder yet. Share the folder with the service account as an Editor, then try again.",
      });

      try {
        await validateGoogleDocsFolderAccess("folder-private");
      } catch (error) {
        expect(isGoogleDocsDeliveryError(error)).toBe(true);
        expect(error).toMatchObject({
          stage: "folder_validation",
          kind: "permission",
        });
      }
    });

    it("surfaces a clear message when the folder id is wrong or not shared", async () => {
      filesGetMock.mockRejectedValue({
        response: {
          status: 404,
          data: {
            error: {
              message: "File not found: folder-missing.",
            },
          },
        },
      });

      const { validateGoogleDocsFolderAccess } = await import("@/lib/google-docs/service");

      await expect(validateGoogleDocsFolderAccess("folder-missing")).rejects.toThrow(
        "We couldn’t find that Google Drive folder. Check the folder ID and confirm the folder is shared with the delivery service account.",
      );
    });

    it("rejects non-folder Drive items", async () => {
      filesGetMock.mockResolvedValue({
        data: {
          id: "doc-123",
          name: "Not a folder",
          mimeType: "application/vnd.google-apps.document",
        },
      });

      const { validateGoogleDocsFolderAccess } = await import("@/lib/google-docs/service");

      await expect(validateGoogleDocsFolderAccess("doc-123")).rejects.toThrow(
        "The Google Drive location must be a folder.",
      );
    });
  });

  describe("createGoogleDocsDelivery", () => {
    it("creates, writes, and moves the document into the configured folder", async () => {
      documentsCreateMock.mockResolvedValue({
        data: {
          documentId: "doc-1",
        },
      });
      documentsBatchUpdateMock.mockResolvedValue({});
      filesGetMock.mockResolvedValue({
        data: {
          parents: ["root"],
          webViewLink: "https://docs.google.com/document/d/doc-1/edit?usp=sharing",
        },
      });
      filesUpdateMock.mockResolvedValue({
        data: {
          id: "doc-1",
          webViewLink: "https://docs.google.com/document/d/doc-1/edit",
        },
      });

      const { createGoogleDocsDelivery } = await import("@/lib/google-docs/service");
      const result = await createGoogleDocsDelivery({
        title: "North Star content plan",
        folderId: "folder-123",
        blocks: [
          { kind: "title", text: "North Star content plan" },
          { kind: "body", text: "Campaign summary goes here." },
        ],
      });

      expect(documentsCreateMock).toHaveBeenCalledWith({
        requestBody: {
          title: "North Star content plan",
        },
      });
      expect(documentsBatchUpdateMock).toHaveBeenCalledWith({
        documentId: "doc-1",
        requestBody: {
          requests: expect.any(Array),
        },
      });
      expect(filesGetMock).toHaveBeenCalledWith({
        fileId: "doc-1",
        fields: "parents,webViewLink",
        supportsAllDrives: true,
      });
      expect(filesUpdateMock).toHaveBeenCalledWith({
        fileId: "doc-1",
        addParents: "folder-123",
        removeParents: "root",
        fields: "id,webViewLink",
        supportsAllDrives: true,
      });
      expect(result).toEqual({
        documentId: "doc-1",
        title: "North Star content plan",
        url: "https://docs.google.com/document/d/doc-1/edit",
      });
    });

    it("maps Google Docs API enablement failures clearly during document creation", async () => {
      documentsCreateMock.mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: {
              message:
                "Google Docs API has not been used in project 123456 before or it is disabled.",
              errors: [
                {
                  reason: "SERVICE_DISABLED",
                },
              ],
            },
          },
        },
      });

      const { createGoogleDocsDelivery, isGoogleDocsDeliveryError } = await import(
        "@/lib/google-docs/service"
      );

      try {
        await createGoogleDocsDelivery({
          title: "North Star content plan",
          folderId: "folder-123",
          blocks: [{ kind: "body", text: "Summary" }],
        });
      } catch (error) {
        expect(isGoogleDocsDeliveryError(error)).toBe(true);
        expect(error).toMatchObject({
          stage: "document_creation",
          kind: "configuration",
          message:
            "Google Docs API is not enabled for the delivery service account project. Enable the Google Docs API and try again.",
          details: {
            status: 403,
            apiReason: "SERVICE_DISABLED",
          },
        });
      }
    });

    it("maps folder permission failures after document creation clearly", async () => {
      documentsCreateMock.mockResolvedValue({
        data: {
          documentId: "doc-1",
        },
      });
      documentsBatchUpdateMock.mockResolvedValue({});
      filesGetMock.mockResolvedValue({
        data: {
          parents: ["root"],
          webViewLink: "https://docs.google.com/document/d/doc-1/edit?usp=sharing",
        },
      });
      filesUpdateMock.mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: {
              message: "The user does not have sufficient permissions for this file.",
            },
          },
        },
      });

      const { createGoogleDocsDelivery, isGoogleDocsDeliveryError } = await import(
        "@/lib/google-docs/service"
      );

      try {
        await createGoogleDocsDelivery({
          title: "North Star content plan",
          folderId: "folder-123",
          blocks: [{ kind: "body", text: "Summary" }],
        });
      } catch (error) {
        expect(isGoogleDocsDeliveryError(error)).toBe(true);
        expect(error).toMatchObject({
          stage: "document_move",
          kind: "permission",
          message:
            "Google Docs created the document, but the delivery service account can’t add it to that Drive folder. Share the folder with the service account as an Editor, then try again.",
        });
      }
    });
  });
});
