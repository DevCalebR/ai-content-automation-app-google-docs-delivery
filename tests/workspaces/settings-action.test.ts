import { beforeEach, describe, expect, it, vi } from "vitest";

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
  const actual = await vi.importActual<typeof import("@/lib/workspaces/service")>(
    "@/lib/workspaces/service",
  );

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
  beforeEach(() => {
    requireSessionMock.mockReset();
    getWorkspaceAuthorizationForUserMock.mockReset();
    revalidatePathMock.mockReset();
    workspaceUpdateMock.mockReset();
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

    const { updateWorkspaceSettingsAction } = await import("@/app/(app)/app/actions");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("name", "Updated Workspace");
    formData.set("description", "Updated description");

    const result = await updateWorkspaceSettingsAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "error",
      message: "Only workspace owners can update settings.",
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

    const { updateWorkspaceSettingsAction } = await import("@/app/(app)/app/actions");
    const formData = new FormData();
    formData.set("workspaceId", "workspace-1");
    formData.set("name", "Updated Workspace");
    formData.set("description", "Updated description");

    const result = await updateWorkspaceSettingsAction({ status: "idle" }, formData);

    expect(workspaceUpdateMock).toHaveBeenCalledWith({
      where: { id: "workspace-1" },
      data: {
        name: "Updated Workspace",
        description: "Updated description",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/workspaces/workspace-1/settings");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/workspaces/workspace-1");
    expect(result).toEqual({
      status: "success",
      message: "Workspace settings updated.",
    });
  });
});
