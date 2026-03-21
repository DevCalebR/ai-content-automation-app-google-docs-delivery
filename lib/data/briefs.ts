import { db } from "@/lib/db";

export async function getBriefsForWorkspace(workspaceId: string) {
  return db.contentBrief.findMany({
    where: { workspaceId },
    include: {
      preset: true,
      _count: {
        select: {
          generationRuns: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getBriefForWorkspace(briefId: string, workspaceId: string) {
  return db.contentBrief.findFirst({
    where: {
      id: briefId,
      workspaceId,
    },
    include: {
      preset: true,
    },
  });
}
