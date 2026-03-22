import { db } from "@/lib/db";

export async function getPresetOptions(workspaceId?: string) {
  return db.preset.findMany({
    where: {
      OR: [{ isSystem: true }, ...(workspaceId ? [{ workspaceId }] : [])],
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}
