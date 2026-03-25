import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();
const requireSessionMock = vi.fn();
const getWorkspaceAuthorizationForUserMock = vi.fn();
const refineRunSectionMock = vi.fn();
const generationRunFindFirstMock = vi.fn();
const structuredOutputUpdateMock = vi.fn();

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

vi.mock("@/lib/ai/refine-section", () => ({
  refineRunSection: refineRunSectionMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    generationRun: {
      findFirst: generationRunFindFirstMock,
    },
    structuredOutput: {
      update: structuredOutputUpdateMock,
    },
  },
}));

describe("section refinement actions", () => {
  beforeEach(() => {
    revalidatePathMock.mockReset();
    requireSessionMock.mockReset();
    getWorkspaceAuthorizationForUserMock.mockReset();
    refineRunSectionMock.mockReset();
    generationRunFindFirstMock.mockReset();
    structuredOutputUpdateMock.mockReset();

    requireSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });

    getWorkspaceAuthorizationForUserMock.mockResolvedValue({
      workspace: {
        id: "workspace-1",
      },
      isOwner: false,
      membership: {
        role: "MEMBER",
      },
    });

    generationRunFindFirstMock.mockResolvedValue({
      id: "run-1",
      workspaceId: "workspace-1",
      model: "gpt-5.4-mini",
      brief: {
        businessName: "North Star Media",
        niche: "B2B SaaS",
        offer: "Content automation",
        audience: "Marketing leads",
        brandVoice: "Direct",
        themes: ["Content systems"],
        platforms: ["LinkedIn"],
        cadence: "Weekly",
        goals: ["Lead generation"],
        ctas: ["Book a demo"],
        promotions: [],
        notes: null,
      },
      preset: null,
      structuredOutput: {
        id: "output-1",
        runId: "run-1",
        workspaceId: "workspace-1",
        campaignSummary: "Original summary",
        calendarEntries: [
          {
            day: "Monday",
            platform: "LinkedIn",
            angle: "Original angle",
            callToAction: "Book a demo",
          },
        ],
        captions: [
          {
            platform: "LinkedIn",
            headline: "Original headline",
            body: "Original body",
          },
        ],
        hashtags: [
          {
            platform: "LinkedIn",
            tags: ["#original", "#b2b", "#growth"],
          },
        ],
        imagePrompts: [
          {
            assetType: "Static post",
            prompt: "Original prompt",
          },
        ],
        rawOutput: {
          campaignSummary: "Original summary",
          calendarEntries: [
            {
              day: "Monday",
              platform: "LinkedIn",
              angle: "Original angle",
              callToAction: "Book a demo",
            },
          ],
          sampleCaptions: [
            {
              platform: "LinkedIn",
              headline: "Original headline",
              body: "Original body",
            },
          ],
          hashtags: [
            {
              platform: "LinkedIn",
              tags: ["#original", "#b2b", "#growth"],
            },
          ],
          imagePrompts: [
            {
              assetType: "Static post",
              prompt: "Original prompt",
            },
          ],
        },
      },
    });
  });

  it("rejects unsupported section keys", async () => {
    const { refineRunSectionAction } = await import("@/app/(app)/app/actions");

    const result = await refineRunSectionAction({
      workspaceId: "workspace-1",
      runId: "run-1",
      sectionKey: "calendar",
      currentContent: [],
      instruction: "Shorter",
    });

    expect(result).toEqual({
      status: "error",
      message: "This section can't be refined yet.",
    });
    expect(refineRunSectionMock).not.toHaveBeenCalled();
  });

  it("rejects empty refinement instructions", async () => {
    const { refineRunSectionAction } = await import("@/app/(app)/app/actions");

    const result = await refineRunSectionAction({
      workspaceId: "workspace-1",
      runId: "run-1",
      sectionKey: "captions",
      currentContent: [
        {
          platform: "LinkedIn",
          headline: "Original headline",
          body: "Original body",
        },
      ],
      instruction: "   ",
    });

    expect(result).toEqual({
      status: "error",
      message: "Enter a refinement instruction.",
    });
    expect(refineRunSectionMock).not.toHaveBeenCalled();
  });

  it("requires workspace authorization before refining a section", async () => {
    getWorkspaceAuthorizationForUserMock.mockResolvedValue(null);

    const { refineRunSectionAction } = await import("@/app/(app)/app/actions");

    const result = await refineRunSectionAction({
      workspaceId: "workspace-1",
      runId: "run-1",
      sectionKey: "captions",
      currentContent: [
        {
          platform: "LinkedIn",
          headline: "Original headline",
          body: "Original body",
        },
      ],
      instruction: "Make it shorter.",
    });

    expect(result).toEqual({
      status: "error",
      message: "Workspace not found.",
    });
    expect(refineRunSectionMock).not.toHaveBeenCalled();
  });

  it("updates only the targeted section and preserves unrelated saved output", async () => {
    structuredOutputUpdateMock.mockResolvedValue({
      id: "output-1",
    });

    const { acceptRunSectionRefinementAction } = await import("@/app/(app)/app/actions");

    const revisedCaptions = [
      {
        platform: "LinkedIn",
        headline: "Refined headline",
        body: "Refined body",
      },
    ];

    const result = await acceptRunSectionRefinementAction({
      workspaceId: "workspace-1",
      runId: "run-1",
      sectionKey: "captions",
      revisedContent: revisedCaptions,
    });

    expect(result).toEqual({
      status: "success",
      message: "Captions updated.",
    });
    expect(structuredOutputUpdateMock).toHaveBeenCalledWith({
      where: {
        runId: "run-1",
      },
      data: {
        captions: revisedCaptions,
        rawOutput: {
          campaignSummary: "Original summary",
          calendarEntries: [
            {
              day: "Monday",
              platform: "LinkedIn",
              angle: "Original angle",
              callToAction: "Book a demo",
            },
          ],
          sampleCaptions: revisedCaptions,
          hashtags: [
            {
              platform: "LinkedIn",
              tags: ["#original", "#b2b", "#growth"],
            },
          ],
          imagePrompts: [
            {
              assetType: "Static post",
              prompt: "Original prompt",
            },
          ],
        },
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/workspaces/workspace-1/results/run-1",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/workspaces/workspace-1/history");
  });
});
