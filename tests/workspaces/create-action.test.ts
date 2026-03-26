import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWorkspaceFormValues,
  createInitialWorkspaceState,
} from "@/lib/validations/workspace";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

const requireSessionMock = vi.fn();
const createWorkspaceWithOwnerMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/lib/workspaces/service", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/workspaces/service")
  >("@/lib/workspaces/service");

  return {
    ...actual,
    createWorkspaceWithOwner: createWorkspaceWithOwnerMock,
  };
});

describe("createWorkspaceAction", () => {
  const initialState = createInitialWorkspaceState(
    buildWorkspaceFormValues({
      workspaceId: "",
      name: "",
      description: "",
    }),
  );

  beforeEach(() => {
    redirectMock.mockReset();
    requireSessionMock.mockReset();
    createWorkspaceWithOwnerMock.mockReset();

    requireSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
  });

  it("returns field-specific validation errors and preserves entered values", async () => {
    const { createWorkspaceAction } = await import("@/app/(app)/app/actions");
    const formData = new FormData();
    formData.set("name", "");
    formData.set("description", "Workspace for the first paying client.");

    const result = await createWorkspaceAction(initialState, formData);

    expect(result).toEqual({
      status: "error",
      message: "Please correct the highlighted fields.",
      values: {
        workspaceId: "",
        name: "",
        description: "Workspace for the first paying client.",
      },
      fieldErrors: {
        name: "Enter a workspace name.",
      },
      submissionId: 1,
    });
    expect(createWorkspaceWithOwnerMock).not.toHaveBeenCalled();
  });

  it("creates the workspace and redirects into the first workspace flow", async () => {
    createWorkspaceWithOwnerMock.mockResolvedValue({
      id: "workspace-1",
    });

    const { createWorkspaceAction } = await import("@/app/(app)/app/actions");
    const formData = new FormData();
    formData.set("name", "North Star Media");
    formData.set("description", "Workspace for the first paying client.");

    await expect(createWorkspaceAction(initialState, formData)).rejects.toThrow(
      "NEXT_REDIRECT:/app/workspaces/workspace-1",
    );

    expect(createWorkspaceWithOwnerMock).toHaveBeenCalledWith({
      ownerId: "user-1",
      name: "North Star Media",
      description: "Workspace for the first paying client.",
    });
  });
});
