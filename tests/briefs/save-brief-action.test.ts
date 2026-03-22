import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildBriefFormValues,
  createInitialBriefState,
  type BriefFormFieldName,
} from "@/lib/validations/brief";

const requireSessionMock = vi.fn();
const getWorkspaceAccessForUserMock = vi.fn();
const revalidatePathMock = vi.fn();
const contentBriefCreateMock = vi.fn();
const contentBriefFindFirstMock = vi.fn();
const contentBriefUpdateMock = vi.fn();
const usageEventCreateMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
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

vi.mock("@/lib/db", () => ({
  db: {
    contentBrief: {
      create: contentBriefCreateMock,
      findFirst: contentBriefFindFirstMock,
      update: contentBriefUpdateMock,
    },
    usageEvent: {
      create: usageEventCreateMock,
    },
  },
}));

function buildValidBriefFields() {
  return {
    workspaceId: "workspace-1",
    presetId: "",
    businessName: "North Star Media",
    niche: "B2B content operations",
    offer: "Done-for-you monthly content systems for SaaS teams",
    audience: "Series A and B SaaS marketers who need consistent pipeline content",
    brandVoice: "Clear, practical, direct, and commercially grounded",
    themes: "operator insights, customer proof, workflow examples",
    platforms: "LinkedIn, Email",
    cadence: "3 posts per week plus 1 email",
    goals: "grow warm pipeline, book discovery calls",
    ctas: "Book a strategy call, reply for the template",
    promotions: "",
    notes: "",
  };
}

function buildFormData(
  overrides: Partial<Record<BriefFormFieldName, string | null | undefined>> = {},
) {
  const formData = new FormData();
  const values = {
    ...buildValidBriefFields(),
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined) {
      formData.set(key, value);
    }
  }

  return formData;
}

describe("saveBriefAction", () => {
  beforeEach(() => {
    requireSessionMock.mockReset();
    getWorkspaceAccessForUserMock.mockReset();
    revalidatePathMock.mockReset();
    contentBriefCreateMock.mockReset();
    contentBriefFindFirstMock.mockReset();
    contentBriefUpdateMock.mockReset();
    usageEventCreateMock.mockReset();

    requireSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });

    getWorkspaceAccessForUserMock.mockResolvedValue({
      id: "workspace-1",
    });
  });

  it("accepts blank optional fields and missing briefId without throwing string/null validation errors", async () => {
    contentBriefCreateMock.mockResolvedValue({
      id: "brief-1",
    });

    const { saveBriefAction } = await import("@/app/(app)/app/actions");
    const result = await saveBriefAction(
      createInitialBriefState(buildBriefFormValues({ workspaceId: "workspace-1" })),
      buildFormData(),
    );

    expect(result).toEqual({
      status: "success",
      message: "Brief saved to the workspace.",
      values: {
        ...buildValidBriefFields(),
        briefId: "brief-1",
      },
      fieldErrors: {},
      submissionId: 1,
    });

    expect(contentBriefCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "workspace-1",
        authorId: "user-1",
        promotions: [],
        notes: undefined,
      }),
    });
  });

  it("returns a single invalid field as a structured field error", async () => {
    const { saveBriefAction } = await import("@/app/(app)/app/actions");
    const result = await saveBriefAction(
      createInitialBriefState(buildBriefFormValues({ workspaceId: "workspace-1" })),
      buildFormData({
        offer: "Too short",
      }),
    );

    expect(result.status).toBe("error");
    expect(result.message).toBe("Please correct the highlighted fields.");
    expect(result.fieldErrors).toEqual({
      offer: "Describe the offer in a bit more detail.",
    });
    expect(contentBriefCreateMock).not.toHaveBeenCalled();
  });

  it("preserves submitted values after a failed save", async () => {
    const submittedValues = buildValidBriefFields();
    const { saveBriefAction } = await import("@/app/(app)/app/actions");
    const result = await saveBriefAction(
      createInitialBriefState(buildBriefFormValues({ workspaceId: "workspace-1" })),
      buildFormData({
        businessName: "",
        notes: "Keep legal review in the loop before publishing case studies.",
      }),
    );

    expect(result).toEqual({
      status: "error",
      message: "Please correct the highlighted fields.",
      values: {
        ...submittedValues,
        businessName: "",
        briefId: "",
        notes: "Keep legal review in the loop before publishing case studies.",
      },
      fieldErrors: {
        businessName: "Enter the business name.",
      },
      submissionId: 1,
    });
  });

  it("keeps the saved values in state after a successful save instead of blanking the form", async () => {
    contentBriefCreateMock.mockResolvedValue({
      id: "brief-99",
    });

    const { saveBriefAction } = await import("@/app/(app)/app/actions");
    const result = await saveBriefAction(
      createInitialBriefState(buildBriefFormValues({ workspaceId: "workspace-1" })),
      buildFormData({
        promotions: "April sprint, Q2 planning",
        notes: "Carry the same CTA into the launch week.",
      }),
    );

    expect(result).toEqual({
      status: "success",
      message: "Brief saved to the workspace.",
      values: {
        ...buildValidBriefFields(),
        briefId: "brief-99",
        promotions: "April sprint, Q2 planning",
        notes: "Carry the same CTA into the launch week.",
      },
      fieldErrors: {},
      submissionId: 1,
    });
  });
});
