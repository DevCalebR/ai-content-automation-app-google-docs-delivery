import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWorkspaceFormValues,
  createInitialWorkspaceState,
} from "@/lib/validations/workspace";

const requireSessionMock = vi.fn();
const getWorkspaceAuthorizationForUserMock = vi.fn();
const revalidatePathMock = vi.fn();
const workspaceUpdateMock = vi.fn();

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
  const actual = await vi.importActual<
    typeof import("@/lib/workspaces/service")
  >("@/lib/workspaces/service");

  return {
    ...actual,
    getWorkspaceAuthorizationForUser: getWorkspaceAuthorizationForUserMock,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    workspace: {
      update: workspaceUpdateMock,
    },
  },
}));

describe("updateWorkspaceSettingsAction", () => {
  const initialState = createInitialWorkspaceState(
    buildWorkspaceFormValues({
      workspaceId: "workspace-1",
      name: "Current Workspace",
      description: "Current description",
    }),
  );

  beforeEach(() => {
    requireSessionMock.mockReset();
    getWorkspaceAuthorizationForUserMock.mockReset();
    revalidatePathMock.mockReset();
    workspaceUpdateMock.mockReset();
  });

  it("returns field-specific validation errors and preserves submitted values", async () => {
    requireSessionMock.mockResolvedValue({
      user: {
        id: "owner-user",
      },
    });

    const { updateWorkspaceSettingsAction } =
      await import("@/app/(app)/app/actions");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("name", "");
    formData.set("description", "Customer-facing workspace copy");

    const result = await updateWorkspaceSettingsAction(initialState, formData);

    expect(result).toEqual({
      status: "error",
      message: "Please correct the highlighted fields.",
      values: {
        workspaceId: "workspace-1",
        name: "",
        description: "Customer-facing workspace copy",
      },
      fieldErrors: {
        name: "Enter a workspace name.",
      },
      submissionId: 1,
    });
    expect(getWorkspaceAuthorizationForUserMock).not.toHaveBeenCalled();
    expect(workspaceUpdateMock).not.toHaveBeenCalled();
  });

  it("blocks members from owner-only workspace settings updates", async () => {
    requireSessionMock.mockResolvedValue({
      user: {
        id: "member-user",
      },
    });

    getWorkspaceAuthorizationForUserMock.mockResolvedValue({
      workspace: {
        id: "workspace-1",
      },
      membership: {
        role: "MEMBER",
      },
      isOwner: false,
    });

    const { updateWorkspaceSettingsAction } =
      await import("@/app/(app)/app/actions");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("name", "Updated Workspace");
    formData.set("description", "Updated description");

    const result = await updateWorkspaceSettingsAction(initialState, formData);

    expect(result).toEqual({
      status: "error",
      message: "Only workspace owners can update settings.",
      values: {
        workspaceId: "workspace-1",
        name: "Updated Workspace",
        description: "Updated description",
      },
      fieldErrors: {},
      submissionId: 1,
    });
    expect(workspaceUpdateMock).not.toHaveBeenCalled();
  });

  it("allows owners to update settings and revalidate workspace views", async () => {
    requireSessionMock.mockResolvedValue({
      user: {
        id: "owner-user",
      },
    });

    getWorkspaceAuthorizationForUserMock.mockResolvedValue({
      workspace: {
        id: "workspace-1",
      },
      membership: {
        role: "OWNER",
      },
      isOwner: true,
    });

    workspaceUpdateMock.mockResolvedValue({});

    const { updateWorkspaceSettingsAction } =
      await import("@/app/(app)/app/actions");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("name", "Updated Workspace");
    formData.set("description", "Updated description");

    const result = await updateWorkspaceSettingsAction(initialState, formData);

    expect(workspaceUpdateMock).toHaveBeenCalledWith({
      where: { id: "workspace-1" },
      data: {
        name: "Updated Workspace",
        description: "Updated description",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/workspaces/workspace-1/settings",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/workspaces/workspace-1",
    );
    expect(result).toEqual({
      status: "success",
      message: "Workspace settings updated.",
      values: {
        workspaceId: "workspace-1",
        name: "Updated Workspace",
        description: "Updated description",
      },
      fieldErrors: {},
      submissionId: 1,
    });
  });
});
