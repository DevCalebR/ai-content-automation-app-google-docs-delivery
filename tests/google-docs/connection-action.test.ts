import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
const getWorkspaceAuthorizationForUserMock = vi.fn();
const hasGoogleDocsServiceAccountConfigMock = vi.fn();
const getGoogleDocsServiceAccountClientsMock = vi.fn();
const hasGoogleDocsOAuthConfigMock = vi.fn();
const createGoogleDocsOAuthClientsMock = vi.fn();
const buildStoredGoogleOAuthTokensMock = vi.fn();
const getStoredGoogleOAuthTokensMock = vi.fn();
const validateGoogleDocsFolderAccessMock = vi.fn();
const integrationConnectionFindFirstMock = vi.fn();
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
  getGoogleDocsServiceAccountClients: getGoogleDocsServiceAccountClientsMock,
  hasGoogleDocsOAuthConfig: hasGoogleDocsOAuthConfigMock,
  createGoogleDocsOAuthClients: createGoogleDocsOAuthClientsMock,
}));

vi.mock("@/lib/google-docs/service", () => ({
  isGoogleDocsDeliveryError: () => false,
  validateGoogleDocsFolderAccess: validateGoogleDocsFolderAccessMock,
}));

vi.mock("@/lib/google-docs/oauth", () => ({
  buildStoredGoogleOAuthTokens: buildStoredGoogleOAuthTokensMock,
  getStoredGoogleOAuthTokens: getStoredGoogleOAuthTokensMock,
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
      findFirst: integrationConnectionFindFirstMock,
      upsert: integrationConnectionUpsertMock,
    },
  },
}));

describe("saveGoogleDocsConnectionAction", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    getWorkspaceAuthorizationForUserMock.mockReset();
    hasGoogleDocsServiceAccountConfigMock.mockReset();
    getGoogleDocsServiceAccountClientsMock.mockReset();
    hasGoogleDocsOAuthConfigMock.mockReset();
    createGoogleDocsOAuthClientsMock.mockReset();
    buildStoredGoogleOAuthTokensMock.mockReset();
    getStoredGoogleOAuthTokensMock.mockReset();
    validateGoogleDocsFolderAccessMock.mockReset();
    integrationConnectionFindFirstMock.mockReset();
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
    hasGoogleDocsOAuthConfigMock.mockReturnValue(true);
    getGoogleDocsServiceAccountClientsMock.mockReturnValue({
      authMode: "SERVICE_ACCOUNT",
      drive: { files: {} },
      docs: { documents: {} },
    });
    createGoogleDocsOAuthClientsMock.mockReturnValue({
      authMode: "USER_OAUTH",
      auth: {
        credentials: {
          access_token: "refreshed-access",
          refresh_token: "refresh-token",
          expiry_date: 1_774_739_200_000,
        },
      },
      drive: { files: {} },
      docs: { documents: {} },
    });
    buildStoredGoogleOAuthTokensMock.mockReturnValue({
      encryptedAccessToken: "encrypted-access-updated",
      encryptedRefreshToken: "encrypted-refresh",
      expiresAt: new Date("2026-03-23T13:00:00.000Z"),
    });
    integrationConnectionFindFirstMock.mockResolvedValue(null);
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

    expect(validateGoogleDocsFolderAccessMock).toHaveBeenCalledWith("folder-123", {
      authMode: "SERVICE_ACCOUNT",
      driveClient: expect.any(Object),
    });
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
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
      }),
      update: expect.objectContaining({
        userId: "user-1",
        status: "CONNECTED",
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
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

  it("saves a My Drive folder with the connected Google account when OAuth is available", async () => {
    integrationConnectionFindFirstMock.mockResolvedValue({
      status: "NOT_CONNECTED",
      encryptedAccessToken: "encrypted-access",
      encryptedRefreshToken: "encrypted-refresh",
      metadata: {
        oauthConnectedAt: "2026-03-23T12:00:00.000Z",
      },
    });
    getStoredGoogleOAuthTokensMock.mockReturnValue({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    validateGoogleDocsFolderAccessMock.mockResolvedValue({
      folderId: "folder-my-drive",
      folderName: "Founder Drive",
    });

    const { saveGoogleDocsConnectionAction } = await import(
      "@/app/(app)/app/actions"
    );
    const { initialGoogleDocsSettingsState } = await import("@/lib/google-docs/state");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("authMode", "USER_OAUTH");
    formData.set("folderId", "folder-my-drive");
    formData.set("titlePrefix", "North Star");

    const result = await saveGoogleDocsConnectionAction(initialGoogleDocsSettingsState, formData);

    expect(getStoredGoogleOAuthTokensMock).toHaveBeenCalledWith({
      status: "NOT_CONNECTED",
      encryptedAccessToken: "encrypted-access",
      encryptedRefreshToken: "encrypted-refresh",
      metadata: {
        oauthConnectedAt: "2026-03-23T12:00:00.000Z",
      },
    });
    expect(validateGoogleDocsFolderAccessMock).toHaveBeenCalledWith("folder-my-drive", {
      authMode: "USER_OAUTH",
      driveClient: expect.any(Object),
    });
    expect(buildStoredGoogleOAuthTokensMock).toHaveBeenCalledWith(
      {
        access_token: "refreshed-access",
        refresh_token: "refresh-token",
        expiry_date: 1_774_739_200_000,
      },
      {
        status: "NOT_CONNECTED",
        encryptedAccessToken: "encrypted-access",
        encryptedRefreshToken: "encrypted-refresh",
        metadata: {
          oauthConnectedAt: "2026-03-23T12:00:00.000Z",
        },
      },
    );
    expect(integrationConnectionUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          encryptedAccessToken: "encrypted-access-updated",
          encryptedRefreshToken: "encrypted-refresh",
        }),
        update: expect.objectContaining({
          encryptedAccessToken: "encrypted-access-updated",
          encryptedRefreshToken: "encrypted-refresh",
        }),
      }),
    );
    expect(result).toEqual({
      status: "success",
      message:
        "Google Docs delivery will use the connected Google account for Founder Drive.",
      values: {
        folderId: "folder-my-drive",
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

  it("preserves the submitted values when folder validation fails", async () => {
    validateGoogleDocsFolderAccessMock.mockRejectedValue(
      new Error(
        "The delivery service account can’t access that Google Drive folder yet. Share the folder with the service account as an Editor, then try again.",
      ),
    );

    const { saveGoogleDocsConnectionAction } = await import(
      "@/app/(app)/app/actions"
    );
    const { initialGoogleDocsSettingsState } = await import("@/lib/google-docs/state");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("folderId", "folder-private");
    formData.set("titlePrefix", "North Star");

    const result = await saveGoogleDocsConnectionAction(initialGoogleDocsSettingsState, formData);

    expect(integrationConnectionUpsertMock).toHaveBeenCalledWith({
      where: {
        workspaceId_provider: {
          workspaceId: "workspace-1",
          provider: "GOOGLE_DOCS",
        },
      },
      create: expect.objectContaining({
        status: "ERROR",
      }),
      update: expect.objectContaining({
        status: "ERROR",
      }),
    });
    expect(result).toEqual({
      status: "error",
      message:
        "The delivery service account can’t access that Google Drive folder yet. Share the folder with the service account as an Editor, then try again.",
      values: {
        folderId: "folder-private",
        titlePrefix: "North Star",
      },
    });
  });
});
