import { beforeEach, describe, expect, it, vi } from "vitest";

class MockGoogleDocsDeliveryError extends Error {
  readonly stage: string;
  readonly kind: string;
  readonly details?: {
    status: number | null;
    apiMessage: string | null;
    apiReason: string | null;
  };

  constructor(
    message: string,
    stage: string,
    kind: string,
    details?: {
      status: number | null;
      apiMessage: string | null;
      apiReason: string | null;
    },
  ) {
    super(message);
    this.name = "GoogleDocsDeliveryError";
    this.stage = stage;
    this.kind = kind;
    this.details = details;
  }
}

const requireSessionMock = vi.fn();
const getWorkspaceAuthorizationForUserMock = vi.fn();
const deliverStructuredOutputToGoogleDocsMock = vi.fn();
const hasGoogleDocsServiceAccountConfigMock = vi.fn();
const getGoogleDocsServiceAccountClientsMock = vi.fn();
const hasGoogleDocsOAuthConfigMock = vi.fn();
const createGoogleDocsOAuthClientsMock = vi.fn();
const buildStoredGoogleOAuthTokensMock = vi.fn();
const getStoredGoogleOAuthTokensMock = vi.fn();
const revalidatePathMock = vi.fn();
const logAuditEventMock = vi.fn();
const logErrorMock = vi.fn();
const generationRunFindFirstMock = vi.fn();
const integrationConnectionFindFirstMock = vi.fn();
const integrationConnectionUpdateMock = vi.fn();
const runDeliveryUpsertMock = vi.fn();
const runDeliveryUpdateMock = vi.fn();
const usageEventCreateMock = vi.fn();

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

vi.mock("@/lib/google-docs/delivery", () => ({
  deliverStructuredOutputToGoogleDocs: deliverStructuredOutputToGoogleDocsMock,
}));

vi.mock("@/lib/google-docs/client", () => ({
  hasGoogleDocsServiceAccountConfig: hasGoogleDocsServiceAccountConfigMock,
  getGoogleDocsServiceAccountClients: getGoogleDocsServiceAccountClientsMock,
  hasGoogleDocsOAuthConfig: hasGoogleDocsOAuthConfigMock,
  createGoogleDocsOAuthClients: createGoogleDocsOAuthClientsMock,
}));

vi.mock("@/lib/google-docs/oauth", () => ({
  buildStoredGoogleOAuthTokens: buildStoredGoogleOAuthTokensMock,
  getStoredGoogleOAuthTokens: getStoredGoogleOAuthTokensMock,
  isGoogleDocsOAuthTokenError: (error: unknown) =>
    error instanceof Error && error.name === "GoogleDocsOAuthTokenError",
}));

vi.mock("@/lib/google-docs/service", () => ({
  isGoogleDocsDeliveryError: (error: unknown) => error instanceof MockGoogleDocsDeliveryError,
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
    generationRun: {
      findFirst: generationRunFindFirstMock,
    },
    integrationConnection: {
      findFirst: integrationConnectionFindFirstMock,
      update: integrationConnectionUpdateMock,
    },
    runDelivery: {
      upsert: runDeliveryUpsertMock,
      update: runDeliveryUpdateMock,
    },
    usageEvent: {
      create: usageEventCreateMock,
    },
  },
}));

describe("deliverRunToGoogleDocsAction", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    getWorkspaceAuthorizationForUserMock.mockReset();
    deliverStructuredOutputToGoogleDocsMock.mockReset();
    hasGoogleDocsServiceAccountConfigMock.mockReset();
    getGoogleDocsServiceAccountClientsMock.mockReset();
    hasGoogleDocsOAuthConfigMock.mockReset();
    createGoogleDocsOAuthClientsMock.mockReset();
    buildStoredGoogleOAuthTokensMock.mockReset();
    getStoredGoogleOAuthTokensMock.mockReset();
    revalidatePathMock.mockReset();
    logAuditEventMock.mockReset();
    logErrorMock.mockReset();
    generationRunFindFirstMock.mockReset();
    integrationConnectionFindFirstMock.mockReset();
    integrationConnectionUpdateMock.mockReset();
    runDeliveryUpsertMock.mockReset();
    runDeliveryUpdateMock.mockReset();
    usageEventCreateMock.mockReset();

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

    generationRunFindFirstMock.mockResolvedValue({
      id: "run-1",
      workspaceId: "workspace-1",
      model: "gpt-5.4-mini",
      createdAt: new Date("2026-03-22T12:00:00.000Z"),
      brief: {
        businessName: "North Star Media",
      },
      structuredOutput: {
        campaignSummary: "Focus the month on lead capture.",
        calendarEntries: [],
        captions: [],
        hashtags: [],
        imagePrompts: [],
      },
    });

    integrationConnectionFindFirstMock.mockResolvedValue({
      status: "CONNECTED",
      metadata: {
        folderId: "folder-123",
        folderName: "Content Delivery",
        titlePrefix: "North Star",
        configuredAt: "2026-03-22T12:00:00.000Z",
      },
    });
    hasGoogleDocsServiceAccountConfigMock.mockReturnValue(true);
    hasGoogleDocsOAuthConfigMock.mockReturnValue(true);
    getGoogleDocsServiceAccountClientsMock.mockReturnValue({
      authMode: "SERVICE_ACCOUNT",
      docs: { documents: {} },
      drive: { files: {} },
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
      docs: { documents: {} },
      drive: { files: {} },
    });
    buildStoredGoogleOAuthTokensMock.mockReturnValue({
      encryptedAccessToken: "encrypted-access-updated",
      encryptedRefreshToken: "encrypted-refresh",
      expiresAt: new Date("2026-03-23T13:00:00.000Z"),
    });
  });

  it("stores a delivered Google Docs record and returns the document link", async () => {
    deliverStructuredOutputToGoogleDocsMock.mockResolvedValue({
      documentId: "doc-1",
      title: "North Star · North Star Media content plan · Mar 22, 2026",
      url: "https://docs.google.com/document/d/doc-1/edit",
    });

    const { deliverRunToGoogleDocsAction } = await import("@/app/(app)/app/actions");
    const { initialGoogleDocsDeliveryState } = await import("@/lib/google-docs/state");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("runId", "run-1");

    const result = await deliverRunToGoogleDocsAction(initialGoogleDocsDeliveryState, formData);

    expect(runDeliveryUpsertMock).toHaveBeenCalled();
    expect(runDeliveryUpdateMock).toHaveBeenCalledWith({
      where: {
        runId_provider: {
          runId: "run-1",
          provider: "GOOGLE_DOCS",
        },
      },
      data: {
        status: "DELIVERED",
        title: "North Star · North Star Media content plan · Mar 22, 2026",
        externalId: "doc-1",
        externalUrl: "https://docs.google.com/document/d/doc-1/edit",
        errorMessage: null,
        deliveredAt: expect.any(Date),
      },
    });
    expect(usageEventCreateMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        workspaceId: "workspace-1",
        type: "RUN_DELIVERED",
        metadata: {
          runId: "run-1",
          provider: "GOOGLE_DOCS",
          documentId: "doc-1",
        },
      },
    });
    expect(logAuditEventMock).toHaveBeenCalledWith({
      action: "google_docs.delivery.started",
      userId: "user-1",
      workspaceId: "workspace-1",
      metadata: {
        authMode: "SERVICE_ACCOUNT",
        runId: "run-1",
        folderId: "folder-123",
        title: "North Star · North Star Media content plan · Mar 22, 2026",
      },
    });
    expect(logAuditEventMock).toHaveBeenCalledWith({
      action: "google_docs.delivery.succeeded",
      userId: "user-1",
      workspaceId: "workspace-1",
      metadata: {
        runId: "run-1",
        documentId: "doc-1",
      },
    });
    expect(result).toEqual({
      status: "success",
      message: "Run delivered to Google Docs.",
      documentUrl: "https://docs.google.com/document/d/doc-1/edit",
    });
  });

  it("uses the connected Google account when the workspace delivery mode is USER_OAUTH", async () => {
    integrationConnectionFindFirstMock.mockResolvedValue({
      status: "CONNECTED",
      encryptedAccessToken: "encrypted-access",
      encryptedRefreshToken: "encrypted-refresh",
      metadata: {
        authMode: "USER_OAUTH",
        folderId: "folder-my-drive",
        folderName: "Founder Drive",
        titlePrefix: "North Star",
        configuredAt: "2026-03-22T12:00:00.000Z",
        oauthConnectedAt: "2026-03-23T12:00:00.000Z",
      },
    });
    getStoredGoogleOAuthTokensMock.mockReturnValue({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    deliverStructuredOutputToGoogleDocsMock.mockResolvedValue({
      documentId: "doc-2",
      title: "North Star · North Star Media content plan · Mar 22, 2026",
      url: "https://docs.google.com/document/d/doc-2/edit",
    });

    const { deliverRunToGoogleDocsAction } = await import("@/app/(app)/app/actions");
    const { initialGoogleDocsDeliveryState } = await import("@/lib/google-docs/state");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("runId", "run-1");

    const result = await deliverRunToGoogleDocsAction(initialGoogleDocsDeliveryState, formData);

    expect(getStoredGoogleOAuthTokensMock).toHaveBeenCalledWith({
      status: "CONNECTED",
      encryptedAccessToken: "encrypted-access",
      encryptedRefreshToken: "encrypted-refresh",
      metadata: {
        authMode: "USER_OAUTH",
        folderId: "folder-my-drive",
        folderName: "Founder Drive",
        titlePrefix: "North Star",
        configuredAt: "2026-03-22T12:00:00.000Z",
        oauthConnectedAt: "2026-03-23T12:00:00.000Z",
      },
    });
    expect(createGoogleDocsOAuthClientsMock).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    expect(buildStoredGoogleOAuthTokensMock).toHaveBeenCalledWith(
      {
        access_token: "refreshed-access",
        refresh_token: "refresh-token",
        expiry_date: 1_774_739_200_000,
      },
      {
        status: "CONNECTED",
        encryptedAccessToken: "encrypted-access",
        encryptedRefreshToken: "encrypted-refresh",
        metadata: {
          authMode: "USER_OAUTH",
          folderId: "folder-my-drive",
          folderName: "Founder Drive",
          titlePrefix: "North Star",
          configuredAt: "2026-03-22T12:00:00.000Z",
          oauthConnectedAt: "2026-03-23T12:00:00.000Z",
        },
      },
    );
    expect(integrationConnectionUpdateMock).toHaveBeenCalledWith({
      where: {
        workspaceId_provider: {
          workspaceId: "workspace-1",
          provider: "GOOGLE_DOCS",
        },
      },
      data: {
        status: "CONNECTED",
        encryptedAccessToken: "encrypted-access-updated",
        encryptedRefreshToken: "encrypted-refresh",
        expiresAt: new Date("2026-03-23T13:00:00.000Z"),
      },
    });
    expect(logAuditEventMock).toHaveBeenCalledWith({
      action: "google_docs.delivery.started",
      userId: "user-1",
      workspaceId: "workspace-1",
      metadata: {
        authMode: "USER_OAUTH",
        runId: "run-1",
        folderId: "folder-my-drive",
        title: "North Star · North Star Media content plan · Mar 22, 2026",
      },
    });
    expect(result).toEqual({
      status: "success",
      message: "Run delivered to Google Docs.",
      documentUrl: "https://docs.google.com/document/d/doc-2/edit",
    });
  });

  it("returns a reconnect message and marks the connection error when OAuth tokens are missing", async () => {
    integrationConnectionFindFirstMock.mockResolvedValue({
      status: "CONNECTED",
      metadata: {
        authMode: "USER_OAUTH",
        folderId: "folder-my-drive",
        folderName: "Founder Drive",
        titlePrefix: "North Star",
        configuredAt: "2026-03-22T12:00:00.000Z",
        oauthConnectedAt: "2026-03-23T12:00:00.000Z",
      },
    });

    const { deliverRunToGoogleDocsAction } = await import("@/app/(app)/app/actions");
    const { initialGoogleDocsDeliveryState } = await import("@/lib/google-docs/state");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("runId", "run-1");

    const result = await deliverRunToGoogleDocsAction(initialGoogleDocsDeliveryState, formData);

    expect(integrationConnectionUpdateMock).toHaveBeenCalledWith({
      where: {
        workspaceId_provider: {
          workspaceId: "workspace-1",
          provider: "GOOGLE_DOCS",
        },
      },
      data: {
        status: "ERROR",
      },
    });
    expect(result).toEqual({
      status: "error",
      message:
          "Reconnect the Google account for this workspace before delivering to My Drive.",
    });
  });

  it("marks the delivery failed and logs the delivery stage when Google Docs delivery throws", async () => {
    deliverStructuredOutputToGoogleDocsMock.mockRejectedValue(
      new MockGoogleDocsDeliveryError(
        "Google Docs created the document, but the delivery service account can’t add it to that Drive folder. Share the folder with the service account as an Editor, then try again.",
        "document_move",
        "permission",
        {
          status: 403,
          apiMessage: "The user does not have sufficient permissions for this file.",
          apiReason: "insufficientFilePermissions",
        },
      ),
    );

    const { deliverRunToGoogleDocsAction } = await import("@/app/(app)/app/actions");
    const { initialGoogleDocsDeliveryState } = await import("@/lib/google-docs/state");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("runId", "run-1");

    const result = await deliverRunToGoogleDocsAction(initialGoogleDocsDeliveryState, formData);

    expect(logErrorMock).toHaveBeenCalledWith(
      {
        name: "GoogleDocsDeliveryError",
        message:
          "Google Docs created the document, but the delivery service account can’t add it to that Drive folder. Share the folder with the service account as an Editor, then try again.",
        stage: "document_move",
        kind: "permission",
        details: {
          status: 403,
          apiMessage: "The user does not have sufficient permissions for this file.",
          apiReason: "insufficientFilePermissions",
        },
        runId: "run-1",
      },
      "google-docs.document_move",
    );
    expect(runDeliveryUpdateMock).toHaveBeenCalledWith({
      where: {
        runId_provider: {
          runId: "run-1",
          provider: "GOOGLE_DOCS",
        },
      },
      data: {
        status: "FAILED",
        errorMessage:
          "Google Docs created the document, but the delivery service account can’t add it to that Drive folder. Share the folder with the service account as an Editor, then try again.",
      },
    });
    expect(usageEventCreateMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        workspaceId: "workspace-1",
        type: "RUN_DELIVERY_FAILED",
        metadata: {
          runId: "run-1",
          provider: "GOOGLE_DOCS",
        },
      },
    });
    expect(logAuditEventMock).toHaveBeenCalledWith({
      action: "google_docs.delivery.failed",
      userId: "user-1",
      workspaceId: "workspace-1",
      metadata: {
        runId: "run-1",
        stage: "document_move",
        kind: "permission",
      },
    });
    expect(result).toEqual({
      status: "error",
      message:
        "Google Docs created the document, but the delivery service account can’t add it to that Drive folder. Share the folder with the service account as an Editor, then try again.",
    });
  });

  it("surfaces a create-stage permission failure from Google Docs clearly", async () => {
    deliverStructuredOutputToGoogleDocsMock.mockRejectedValue(
      new MockGoogleDocsDeliveryError(
        "Google Docs rejected document creation for this service account. Confirm the Google Docs API is enabled for the project and that the service account is allowed to create documents.",
        "document_creation",
        "permission",
        {
          status: 403,
          apiMessage: "The caller does not have permission",
          apiReason: "forbidden",
        },
      ),
    );

    const { deliverRunToGoogleDocsAction } = await import("@/app/(app)/app/actions");
    const { initialGoogleDocsDeliveryState } = await import("@/lib/google-docs/state");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("runId", "run-1");

    const result = await deliverRunToGoogleDocsAction(initialGoogleDocsDeliveryState, formData);

    expect(logErrorMock).toHaveBeenCalledWith(
      {
        name: "GoogleDocsDeliveryError",
        message:
          "Google Docs rejected document creation for this service account. Confirm the Google Docs API is enabled for the project and that the service account is allowed to create documents.",
        stage: "document_creation",
        kind: "permission",
        details: {
          status: 403,
          apiMessage: "The caller does not have permission",
          apiReason: "forbidden",
        },
        runId: "run-1",
      },
      "google-docs.document_creation",
    );
    expect(runDeliveryUpdateMock).toHaveBeenCalledWith({
      where: {
        runId_provider: {
          runId: "run-1",
          provider: "GOOGLE_DOCS",
        },
      },
      data: {
        status: "FAILED",
        errorMessage:
          "Google Docs rejected document creation for this service account. Confirm the Google Docs API is enabled for the project and that the service account is allowed to create documents.",
      },
    });
    expect(result).toEqual({
      status: "error",
      message:
        "Google Docs rejected document creation for this service account. Confirm the Google Docs API is enabled for the project and that the service account is allowed to create documents.",
    });
  });
});
