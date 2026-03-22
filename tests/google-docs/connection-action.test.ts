import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
const getWorkspaceAuthorizationForUserMock = vi.fn();
const hasGoogleDocsServiceAccountConfigMock = vi.fn();
const validateGoogleDocsFolderAccessMock = vi.fn();
const integrationConnectionUpsertMock = vi.fn();
const revalidatePathMock = vi.fn();
const logAuditEventMock = vi.fn();
const logErrorMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/lib/workspaces/service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/workspaces/service")>(
    "@/lib/workspaces/service",
  );

  return {
    ...actual,
    getWorkspaceAuthorizationForUser: getWorkspaceAuthorizationForUserMock,
  };
});

vi.mock("@/lib/google-docs/client", () => ({
  hasGoogleDocsServiceAccountConfig: hasGoogleDocsServiceAccountConfigMock,
}));

vi.mock("@/lib/google-docs/service", () => ({
  validateGoogleDocsFolderAccess: validateGoogleDocsFolderAccessMock,
}));

vi.mock("@/lib/logger", async () => {
  const actual = await vi.importActual<typeof import("@/lib/logger")>("@/lib/logger");

  return {
    ...actual,
    logAuditEvent: logAuditEventMock,
    logError: logErrorMock,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    integrationConnection: {
      upsert: integrationConnectionUpsertMock,
    },
  },
}));

describe("saveGoogleDocsConnectionAction", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    getWorkspaceAuthorizationForUserMock.mockReset();
    hasGoogleDocsServiceAccountConfigMock.mockReset();
    validateGoogleDocsFolderAccessMock.mockReset();
    integrationConnectionUpsertMock.mockReset();
    revalidatePathMock.mockReset();
    logAuditEventMock.mockReset();
    logErrorMock.mockReset();

    requireSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });

    getWorkspaceAuthorizationForUserMock.mockResolvedValue({
      workspace: {
        id: "workspace-1",
      },
      isOwner: true,
      membership: {
        role: "OWNER",
      },
    });

    hasGoogleDocsServiceAccountConfigMock.mockReturnValue(true);
  });

  it("connects a workspace folder after validating access", async () => {
    validateGoogleDocsFolderAccessMock.mockResolvedValue({
      folderId: "folder-123",
      folderName: "Content Delivery",
    });

    const { saveGoogleDocsConnectionAction } = await import(
      "@/app/(app)/app/actions"
    );
    const { initialGoogleDocsSettingsState } = await import("@/lib/google-docs/state");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("folderId", "folder-123");
    formData.set("titlePrefix", "North Star");

    const result = await saveGoogleDocsConnectionAction(initialGoogleDocsSettingsState, formData);

    expect(validateGoogleDocsFolderAccessMock).toHaveBeenCalledWith("folder-123");
    expect(integrationConnectionUpsertMock).toHaveBeenCalledWith({
      where: {
        workspaceId_provider: {
          workspaceId: "workspace-1",
          provider: "GOOGLE_DOCS",
        },
      },
      create: expect.objectContaining({
        workspaceId: "workspace-1",
        userId: "user-1",
        provider: "GOOGLE_DOCS",
        status: "CONNECTED",
      }),
      update: expect.objectContaining({
        userId: "user-1",
        status: "CONNECTED",
      }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/workspaces/workspace-1/settings");
    expect(result).toEqual({
      status: "success",
      message: "Google Docs delivery is connected to Content Delivery.",
      values: {
        folderId: "folder-123",
        titlePrefix: "North Star",
      },
    });
  });

  it("returns a safe error when the server is not configured for delivery", async () => {
    hasGoogleDocsServiceAccountConfigMock.mockReturnValue(false);

    const { saveGoogleDocsConnectionAction } = await import(
      "@/app/(app)/app/actions"
    );
    const { initialGoogleDocsSettingsState } = await import("@/lib/google-docs/state");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("folderId", "folder-123");
    formData.set("titlePrefix", "North Star");

    const result = await saveGoogleDocsConnectionAction(initialGoogleDocsSettingsState, formData);

    expect(validateGoogleDocsFolderAccessMock).not.toHaveBeenCalled();
    expect(integrationConnectionUpsertMock).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.values).toEqual({
      folderId: "folder-123",
      titlePrefix: "North Star",
    });
  });
});
