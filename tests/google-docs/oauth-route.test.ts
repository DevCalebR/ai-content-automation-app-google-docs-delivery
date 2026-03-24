import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.fn();
const getWorkspaceAuthorizationForUserMock = vi.fn();
const hasGoogleDocsOAuthConfigMock = vi.fn();
const getGoogleDocsOAuthAuthorizeUrlMock = vi.fn();
const createGoogleOAuthClientMock = vi.fn();
const createGoogleDocsOAuthStateTokenMock = vi.fn();
const readGoogleDocsOAuthStateTokenMock = vi.fn();
const buildStoredGoogleOAuthTokensMock = vi.fn();
const integrationConnectionFindFirstMock = vi.fn();
const integrationConnectionUpsertMock = vi.fn();
const logAuditEventMock = vi.fn();
const logErrorMock = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
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
  hasGoogleDocsOAuthConfig: hasGoogleDocsOAuthConfigMock,
  getGoogleDocsOAuthAuthorizeUrl: getGoogleDocsOAuthAuthorizeUrlMock,
  createGoogleOAuthClient: createGoogleOAuthClientMock,
}));

vi.mock("@/lib/google-docs/oauth", () => ({
  createGoogleDocsOAuthStateToken: createGoogleDocsOAuthStateTokenMock,
  readGoogleDocsOAuthStateToken: readGoogleDocsOAuthStateTokenMock,
  buildStoredGoogleOAuthTokens: buildStoredGoogleOAuthTokensMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    integrationConnection: {
      findFirst: integrationConnectionFindFirstMock,
      upsert: integrationConnectionUpsertMock,
    },
  },
}));

vi.mock("@/lib/logger", async () => {
  const actual = await vi.importActual<typeof import("@/lib/logger")>("@/lib/logger");

  return {
    ...actual,
    logAuditEvent: logAuditEventMock,
    logError: logErrorMock,
  };
});

describe("google docs oauth routes", () => {
  beforeEach(() => {
    vi.resetModules();
    getServerSessionMock.mockReset();
    getWorkspaceAuthorizationForUserMock.mockReset();
    hasGoogleDocsOAuthConfigMock.mockReset();
    getGoogleDocsOAuthAuthorizeUrlMock.mockReset();
    createGoogleOAuthClientMock.mockReset();
    createGoogleDocsOAuthStateTokenMock.mockReset();
    readGoogleDocsOAuthStateTokenMock.mockReset();
    buildStoredGoogleOAuthTokensMock.mockReset();
    integrationConnectionFindFirstMock.mockReset();
    integrationConnectionUpsertMock.mockReset();
    logAuditEventMock.mockReset();
    logErrorMock.mockReset();

    getServerSessionMock.mockResolvedValue({
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

    hasGoogleDocsOAuthConfigMock.mockReturnValue(true);
  });

  it("redirects the owner to the Google OAuth consent screen", async () => {
    createGoogleDocsOAuthStateTokenMock.mockReturnValue("state-token");
    getGoogleDocsOAuthAuthorizeUrlMock.mockReturnValue(
      "https://accounts.google.com/o/oauth2/v2/auth?state=state-token",
    );

    const { GET } = await import("@/app/api/google-docs/connect/route");
    const response = await GET(
      new Request("http://localhost:3000/api/google-docs/connect?workspaceId=workspace-1"),
    );

    expect(createGoogleDocsOAuthStateTokenMock).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      userId: "user-1",
      returnTo: expect.stringContaining("/app/workspaces/workspace-1/settings"),
    });
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?state=state-token",
    );
  });

  it("redirects unauthenticated connect requests to sign-in", async () => {
    getServerSessionMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/google-docs/connect/route");
    const response = await GET(
      new Request("http://localhost:3000/api/google-docs/connect?workspaceId=workspace-1"),
    );

    expect(getWorkspaceAuthorizationForUserMock).not.toHaveBeenCalled();
    expect(createGoogleDocsOAuthStateTokenMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/sign-in");
  });

  it("blocks non-owners from starting the OAuth flow", async () => {
    getWorkspaceAuthorizationForUserMock.mockResolvedValue({
      workspace: {
        id: "workspace-1",
      },
      isOwner: false,
      membership: {
        role: "MEMBER",
      },
    });

    const { GET } = await import("@/app/api/google-docs/connect/route");
    const response = await GET(
      new Request("http://localhost:3000/api/google-docs/connect?workspaceId=workspace-1"),
    );

    expect(createGoogleDocsOAuthStateTokenMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain(
      "googleDocsStatus=oauth-forbidden",
    );
  });

  it("stores encrypted Google OAuth tokens after a successful callback", async () => {
    const getTokenMock = vi.fn().mockResolvedValue({
      tokens: {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expiry_date: 1_774_739_200_000,
      },
    });

    readGoogleDocsOAuthStateTokenMock.mockReturnValue({
      workspaceId: "workspace-1",
      userId: "user-1",
      returnTo: "http://localhost:3000/app/workspaces/workspace-1/settings",
      expiresAt: Date.now() + 60_000,
    });
    createGoogleOAuthClientMock.mockReturnValue({
      getToken: getTokenMock,
    });
    buildStoredGoogleOAuthTokensMock.mockReturnValue({
      encryptedAccessToken: "encrypted-access",
      encryptedRefreshToken: "encrypted-refresh",
      expiresAt: new Date("2026-03-23T13:00:00.000Z"),
    });
    integrationConnectionFindFirstMock.mockResolvedValue({
      status: "ERROR",
      metadata: {
        folderId: "folder-123",
        folderName: "Content Delivery",
        titlePrefix: "North Star",
        configuredAt: "2026-03-22T12:00:00.000Z",
      },
    });

    const { GET } = await import("@/app/api/google-docs/callback/route");
    const response = await GET(
      new Request(
        "http://localhost:3000/api/google-docs/callback?state=state-token&code=oauth-code",
      ),
    );

    expect(getTokenMock).toHaveBeenCalledWith("oauth-code");
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
        encryptedAccessToken: "encrypted-access",
        encryptedRefreshToken: "encrypted-refresh",
      }),
      update: expect.objectContaining({
        userId: "user-1",
        status: "CONNECTED",
        encryptedAccessToken: "encrypted-access",
        encryptedRefreshToken: "encrypted-refresh",
      }),
    });
    expect(logAuditEventMock).toHaveBeenCalledWith({
      action: "google_docs.oauth.connected",
      userId: "user-1",
      workspaceId: "workspace-1",
      metadata: {
        status: "CONNECTED",
      },
    });
    expect(response.headers.get("location")).toContain("googleDocsStatus=oauth-connected");
  });

  it("rejects callback requests with an invalid state token", async () => {
    readGoogleDocsOAuthStateTokenMock.mockReturnValue(null);

    const { GET } = await import("@/app/api/google-docs/callback/route");
    const response = await GET(
      new Request(
        "http://localhost:3000/api/google-docs/callback?state=bad-state&code=oauth-code",
      ),
    );

    expect(createGoogleOAuthClientMock).not.toHaveBeenCalled();
    expect(integrationConnectionUpsertMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain(
      "googleDocsStatus=oauth-invalid-state",
    );
  });

  it("rejects callback requests when the session user does not match the signed state", async () => {
    readGoogleDocsOAuthStateTokenMock.mockReturnValue({
      workspaceId: "workspace-1",
      userId: "user-2",
      returnTo: "http://localhost:3000/app/workspaces/workspace-1/settings",
      expiresAt: Date.now() + 60_000,
    });

    const { GET } = await import("@/app/api/google-docs/callback/route");
    const response = await GET(
      new Request(
        "http://localhost:3000/api/google-docs/callback?state=state-token&code=oauth-code",
      ),
    );

    expect(getWorkspaceAuthorizationForUserMock).not.toHaveBeenCalled();
    expect(createGoogleOAuthClientMock).not.toHaveBeenCalled();
    expect(integrationConnectionUpsertMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain(
      "googleDocsStatus=oauth-session-mismatch",
    );
  });

  it("records OAuth denial and redirects back with a cancelled status", async () => {
    readGoogleDocsOAuthStateTokenMock.mockReturnValue({
      workspaceId: "workspace-1",
      userId: "user-1",
      returnTo: "http://localhost:3000/app/workspaces/workspace-1/settings",
      expiresAt: Date.now() + 60_000,
    });

    const { GET } = await import("@/app/api/google-docs/callback/route");
    const response = await GET(
      new Request(
        "http://localhost:3000/api/google-docs/callback?state=state-token&error=access_denied",
      ),
    );

    expect(createGoogleOAuthClientMock).not.toHaveBeenCalled();
    expect(integrationConnectionUpsertMock).not.toHaveBeenCalled();
    expect(logAuditEventMock).toHaveBeenCalledWith({
      action: "google_docs.oauth.denied",
      userId: "user-1",
      workspaceId: "workspace-1",
      metadata: {
        error: "access_denied",
      },
    });
    expect(response.headers.get("location")).toContain(
      "googleDocsStatus=oauth-cancelled",
    );
  });

  it("requires a durable refresh token before completing the callback", async () => {
    const getTokenMock = vi.fn().mockResolvedValue({
      tokens: {
        access_token: "access-token",
      },
    });

    readGoogleDocsOAuthStateTokenMock.mockReturnValue({
      workspaceId: "workspace-1",
      userId: "user-1",
      returnTo: "http://localhost:3000/app/workspaces/workspace-1/settings",
      expiresAt: Date.now() + 60_000,
    });
    createGoogleOAuthClientMock.mockReturnValue({
      getToken: getTokenMock,
    });
    integrationConnectionFindFirstMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/google-docs/callback/route");
    const response = await GET(
      new Request(
        "http://localhost:3000/api/google-docs/callback?state=state-token&code=oauth-code",
      ),
    );

    expect(buildStoredGoogleOAuthTokensMock).not.toHaveBeenCalled();
    expect(integrationConnectionUpsertMock).not.toHaveBeenCalled();
    expect(logAuditEventMock).toHaveBeenCalledWith({
      action: "google_docs.oauth.refresh_token_missing",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(response.headers.get("location")).toContain(
      "googleDocsStatus=oauth-refresh-required",
    );
  });
});
