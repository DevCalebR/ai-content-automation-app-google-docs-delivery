import { beforeEach, describe, expect, it, vi } from "vitest";

const filesGetMock = vi.fn();
const getGoogleDriveClientMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/google-docs/client", () => ({
  getGoogleDocsClient: vi.fn(),
  getGoogleDriveClient: getGoogleDriveClientMock,
}));

describe("validateGoogleDocsFolderAccess", () => {
  beforeEach(() => {
    filesGetMock.mockReset();
    getGoogleDriveClientMock.mockReset();
    getGoogleDriveClientMock.mockReturnValue({
      files: {
        get: filesGetMock,
      },
    });
  });

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

    const { validateGoogleDocsFolderAccess } = await import("@/lib/google-docs/service");

    await expect(validateGoogleDocsFolderAccess("folder-private")).rejects.toThrow(
      "The delivery service account can’t access that Google Drive folder yet. Share the folder with the service account as an Editor, then try again.",
    );
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
