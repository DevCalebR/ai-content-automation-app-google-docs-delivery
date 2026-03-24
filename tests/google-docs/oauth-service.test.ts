import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getGoogleDocsClientMock = vi.fn();
const getGoogleDriveClientMock = vi.fn();

vi.mock("@/lib/google-docs/client", () => ({
  getGoogleDocsClient: getGoogleDocsClientMock,
  getGoogleDriveClient: getGoogleDriveClientMock,
}));

describe("google docs service oauth delivery", () => {
  beforeEach(() => {
    getGoogleDocsClientMock.mockReset();
    getGoogleDriveClientMock.mockReset();
  });

  it("creates a Google Doc directly inside the connected user's folder", async () => {
    const filesCreateMock = vi.fn().mockResolvedValue({
      data: {
        id: "doc-oauth-1",
        webViewLink: "https://docs.google.com/document/d/doc-oauth-1/edit",
      },
    });
    const batchUpdateMock = vi.fn().mockResolvedValue({});

    const { createGoogleDocsDelivery } = await import("@/lib/google-docs/service");
    const result = await createGoogleDocsDelivery({
      title: "North Star content plan",
      folderId: "folder-my-drive",
      blocks: [
        { kind: "title", text: "North Star content plan" },
        { kind: "body", text: "Campaign summary goes here." },
      ],
      authMode: "USER_OAUTH",
      docsClient: {
        documents: {
          batchUpdate: batchUpdateMock,
        },
      } as never,
      driveClient: {
        files: {
          create: filesCreateMock,
        },
      } as never,
    });

    expect(filesCreateMock).toHaveBeenCalledWith({
      requestBody: {
        name: "North Star content plan",
        mimeType: "application/vnd.google-apps.document",
        parents: ["folder-my-drive"],
      },
      fields: "id,webViewLink",
      supportsAllDrives: true,
    });
    expect(batchUpdateMock).toHaveBeenCalledWith({
      documentId: "doc-oauth-1",
      requestBody: {
        requests: expect.any(Array),
      },
    });
    expect(result).toEqual({
      documentId: "doc-oauth-1",
      title: "North Star content plan",
      url: "https://docs.google.com/document/d/doc-oauth-1/edit",
    });
    expect(getGoogleDocsClientMock).not.toHaveBeenCalled();
    expect(getGoogleDriveClientMock).not.toHaveBeenCalled();
  });

  it("maps OAuth document creation permission failures clearly", async () => {
    const filesCreateMock = vi.fn().mockRejectedValue({
      response: {
        status: 403,
        data: {
          error: {
            message: "The caller does not have permission",
            errors: [
              {
                reason: "forbidden",
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
        folderId: "folder-my-drive",
        blocks: [{ kind: "body", text: "Summary" }],
        authMode: "USER_OAUTH",
        docsClient: {
          documents: {
            batchUpdate: vi.fn(),
          },
        } as never,
        driveClient: {
          files: {
            create: filesCreateMock,
          },
        } as never,
      });
    } catch (error) {
      expect(isGoogleDocsDeliveryError(error)).toBe(true);
      expect(error).toMatchObject({
        stage: "document_creation",
        kind: "permission",
        message:
          "Google Docs rejected document creation for the connected Google account. Confirm that account can create Docs in the selected folder and try again.",
        details: {
          status: 403,
          apiMessage: "The caller does not have permission",
          apiReason: "forbidden",
        },
      });
    }
  });
});
