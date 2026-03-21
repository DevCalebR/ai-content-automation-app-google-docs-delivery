import { describe, expect, it, vi } from "vitest";
import { createWorkspaceWithOwner, getWorkspaceAccessForUser } from "@/lib/workspaces/service";
import { runWithRollback } from "@/tests/helpers/transactions";

describe("workspace ownership and membership defaults", () => {
  it("creates the owner intentionally and leaves other memberships at MEMBER by default", async () => {
    await runWithRollback(async (tx) => {
      const owner = await tx.user.create({
        data: {
          email: `owner-${crypto.randomUUID()}@example.com`,
          name: "Owner",
          passwordHash: "hashed",
        },
      });

      const member = await tx.user.create({
        data: {
          email: `member-${crypto.randomUUID()}@example.com`,
          name: "Member",
          passwordHash: "hashed",
        },
      });

      const outsider = await tx.user.create({
        data: {
          email: `outsider-${crypto.randomUUID()}@example.com`,
          name: "Outsider",
          passwordHash: "hashed",
        },
      });

      const workspace = await createWorkspaceWithOwner(
        {
          ownerId: owner.id,
          name: "North Star Media",
          description: "Workspace ownership hardening test",
        },
        {
          database: tx,
          audit: vi.fn(),
        },
      );

      expect(workspace.ownerId).toBe(owner.id);

      const ownerMembership = await tx.workspaceMembership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: owner.id,
          },
        },
      });

      expect(ownerMembership?.role).toBe("OWNER");

      const memberMembership = await tx.workspaceMembership.create({
        data: {
          workspaceId: workspace.id,
          userId: member.id,
        },
      });

      expect(memberMembership.role).toBe("MEMBER");

      const memberAccess = await getWorkspaceAccessForUser(workspace.id, member.id, tx);
      const outsiderAccess = await getWorkspaceAccessForUser(workspace.id, outsider.id, tx);

      expect(memberAccess?.id).toBe(workspace.id);
      expect(outsiderAccess).toBeNull();
    });
  });
});
