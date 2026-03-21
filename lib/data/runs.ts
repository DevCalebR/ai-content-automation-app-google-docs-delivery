import { db } from "@/lib/db";

export async function getRunsForWorkspace(workspaceId: string) {
  return db.generationRun.findMany({
    where: { workspaceId },
    include: {
      brief: true,
      preset: true,
      structuredOutput: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRunForWorkspace(runId: string, workspaceId: string) {
  return db.generationRun.findFirst({
    where: {
      id: runId,
      workspaceId,
    },
    include: {
      brief: true,
      preset: true,
      structuredOutput: true,
    },
  });
}
