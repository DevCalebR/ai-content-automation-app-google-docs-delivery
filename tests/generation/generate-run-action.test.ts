import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

const requireSessionMock = vi.fn();
const getWorkspaceAccessForUserMock = vi.fn();
const assertRateLimitReadyMock = vi.fn();
const generateCampaignPlanMock = vi.fn();
const revalidatePathMock = vi.fn();
const logErrorMock = vi.fn();
const contentBriefFindFirstMock = vi.fn();
const presetFindFirstMock = vi.fn();
const presetFindUniqueMock = vi.fn();
const generationRunCreateMock = vi.fn();
const generationRunUpdateMock = vi.fn();
const structuredOutputCreateMock = vi.fn();
const usageEventCreateMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
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
    getWorkspaceAccessForUser: getWorkspaceAccessForUserMock,
  };
});

vi.mock("@/lib/rate-limit", () => ({
  assertRateLimitReady: assertRateLimitReadyMock,
}));

vi.mock("@/lib/ai/generate", () => ({
  generateCampaignPlan: generateCampaignPlanMock,
}));

vi.mock("@/lib/logger", async () => {
  const actual = await vi.importActual<typeof import("@/lib/logger")>("@/lib/logger");

  return {
    ...actual,
    logError: logErrorMock,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    contentBrief: {
      findFirst: contentBriefFindFirstMock,
    },
    preset: {
      findFirst: presetFindFirstMock,
      findUnique: presetFindUniqueMock,
    },
    generationRun: {
      create: generationRunCreateMock,
      update: generationRunUpdateMock,
    },
    structuredOutput: {
      create: structuredOutputCreateMock,
    },
    usageEvent: {
      create: usageEventCreateMock,
    },
  },
}));

describe("generateRunAction", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    requireSessionMock.mockReset();
    getWorkspaceAccessForUserMock.mockReset();
    assertRateLimitReadyMock.mockReset();
    generateCampaignPlanMock.mockReset();
    revalidatePathMock.mockReset();
    logErrorMock.mockReset();
    contentBriefFindFirstMock.mockReset();
    presetFindFirstMock.mockReset();
    presetFindUniqueMock.mockReset();
    generationRunCreateMock.mockReset();
    generationRunUpdateMock.mockReset();
    structuredOutputCreateMock.mockReset();
    usageEventCreateMock.mockReset();

    requireSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });

    getWorkspaceAccessForUserMock.mockResolvedValue({
      id: "workspace-1",
    });

    assertRateLimitReadyMock.mockResolvedValue({
      allowed: true,
    });

    contentBriefFindFirstMock.mockResolvedValue({
      id: "brief-1",
      workspaceId: "workspace-1",
      presetId: null,
      businessName: "North Star Media",
    });

    generationRunCreateMock.mockResolvedValue({
      id: "run-1",
    });
  });

  it("redirects successful generations without marking the run as failed", async () => {
    generateCampaignPlanMock.mockResolvedValue({
      campaignSummary: "One-week operator campaign.",
      calendarEntries: [{ day: "Monday", platform: "LinkedIn", angle: "POV", callToAction: "Book a call" }],
      sampleCaptions: [{ platform: "LinkedIn", headline: "Headline", body: "Caption body" }],
      hashtags: [{ platform: "LinkedIn", tags: ["#b2b", "#contentops"] }],
      imagePrompts: [{ assetType: "Static post", prompt: "Operator desk scene" }],
    });

    structuredOutputCreateMock.mockResolvedValue({
      id: "output-1",
    });

    const { generateRunAction } = await import("@/app/(app)/app/actions");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("briefId", "brief-1");
    formData.set("presetId", "");

    await expect(generateRunAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/app/workspaces/workspace-1/results/run-1",
    );

    expect(generationRunUpdateMock).toHaveBeenCalledTimes(1);
    expect(generationRunUpdateMock).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: {
        status: "SUCCEEDED",
        completedAt: expect.any(Date),
        outputId: "output-1",
      },
    });
    expect(logErrorMock).not.toHaveBeenCalled();
    expect(usageEventCreateMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        workspaceId: "workspace-1",
        type: "GENERATION_COMPLETED",
        metadata: {
          runId: "run-1",
        },
      },
    });
  });

  it("still marks the run failed and redirects when generation throws a real error", async () => {
    generateCampaignPlanMock.mockRejectedValue(new Error("OpenAI request failed."));

    const { generateRunAction } = await import("@/app/(app)/app/actions");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("briefId", "brief-1");
    formData.set("presetId", "");

    await expect(generateRunAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/app/workspaces/workspace-1/results/run-1",
    );

    expect(logErrorMock).toHaveBeenCalledWith(expect.any(Error), "generation");
    expect(generationRunUpdateMock).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: {
        status: "FAILED",
        errorMessage: "OpenAI request failed.",
        completedAt: expect.any(Date),
      },
    });
    expect(usageEventCreateMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        workspaceId: "workspace-1",
        type: "GENERATION_FAILED",
        metadata: {
          runId: "run-1",
        },
      },
    });
  });

  it("preserves the sign-in redirect for unauthenticated generation attempts", async () => {
    requireSessionMock.mockRejectedValue(new Error("NEXT_REDIRECT:/sign-in"));

    const { generateRunAction } = await import("@/app/(app)/app/actions");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("briefId", "brief-1");
    formData.set("presetId", "");

    await expect(generateRunAction(formData)).rejects.toThrow("NEXT_REDIRECT:/sign-in");

    expect(generationRunCreateMock).not.toHaveBeenCalled();
    expect(generationRunUpdateMock).not.toHaveBeenCalled();
    expect(logErrorMock).not.toHaveBeenCalled();
  });
});
