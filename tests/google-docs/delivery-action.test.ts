import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
const getWorkspaceAuthorizationForUserMock = vi.fn();
const deliverStructuredOutputToGoogleDocsMock = vi.fn();
const revalidatePathMock = vi.fn();
const logAuditEventMock = vi.fn();
const logErrorMock = vi.fn();
const generationRunFindFirstMock = vi.fn();
const integrationConnectionFindFirstMock = vi.fn();
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
    revalidatePathMock.mockReset();
    logAuditEventMock.mockReset();
    logErrorMock.mockReset();
    generationRunFindFirstMock.mockReset();
    integrationConnectionFindFirstMock.mockReset();
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
    expect(result).toEqual({
      status: "success",
      message: "Run delivered to Google Docs.",
      documentUrl: "https://docs.google.com/document/d/doc-1/edit",
    });
  });

  it("marks the delivery failed when Google Docs delivery throws", async () => {
    deliverStructuredOutputToGoogleDocsMock.mockRejectedValue(
      new Error("Google Docs delivery failed."),
    );

    const { deliverRunToGoogleDocsAction } = await import("@/app/(app)/app/actions");
    const { initialGoogleDocsDeliveryState } = await import("@/lib/google-docs/state");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("runId", "run-1");

    const result = await deliverRunToGoogleDocsAction(initialGoogleDocsDeliveryState, formData);

    expect(logErrorMock).toHaveBeenCalledWith(expect.any(Error), "google-docs.delivery");
    expect(runDeliveryUpdateMock).toHaveBeenCalledWith({
      where: {
        runId_provider: {
          runId: "run-1",
          provider: "GOOGLE_DOCS",
        },
      },
      data: {
        status: "FAILED",
        errorMessage: "Google Docs delivery failed.",
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
    expect(result).toEqual({
      status: "error",
      message: "Google Docs delivery failed.",
    });
  });
});
