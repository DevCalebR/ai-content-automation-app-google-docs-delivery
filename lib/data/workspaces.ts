import { db } from "@/lib/db";
import { getWorkspaceAccessForUser } from "@/lib/workspaces/service";

export async function getUserWorkspaces(userId: string) {
  return db.workspace.findMany({
    where: {
      memberships: {
        some: {
          userId,
        },
      },
    },
    include: {
      _count: {
        select: {
          briefs: true,
          generationRuns: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getWorkspaceForUser(workspaceId: string, userId: string) {
  const workspace = await getWorkspaceAccessForUser(workspaceId, userId);

  if (!workspace) {
    return null;
  }

  return db.workspace.findUnique({
    where: { id: workspace.id },
    include: {
      _count: {
        select: {
          briefs: true,
          generationRuns: true,
        },
      },
    },
  });
}
