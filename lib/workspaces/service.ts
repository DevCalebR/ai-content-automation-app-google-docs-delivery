import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/logger";
import { slugify } from "@/lib/utils";

type WorkspaceDatabase = Pick<PrismaClient, "workspace" | "usageEvent">;
type WorkspaceAccessDatabase = Pick<PrismaClient, "workspace" | "workspaceMembership">;

export async function createWorkspaceWithOwner(
  input: {
    ownerId: string;
    name: string;
    description?: string;
  },
  options: {
    database?: WorkspaceDatabase;
    audit?: typeof logAuditEvent;
  } = {},
) {
  const database = options.database ?? db;
  const audit = options.audit ?? logAuditEvent;

  const baseSlug = slugify(input.name) || "workspace";
  let slug = baseSlug;
  let index = 1;

  while (await database.workspace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  const workspace = await database.workspace.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      ownerId: input.ownerId,
      memberships: {
        create: {
          userId: input.ownerId,
          role: "OWNER",
        },
      },
    },
  });

  await database.usageEvent.create({
    data: {
      userId: input.ownerId,
      workspaceId: workspace.id,
      type: "WORKSPACE_CREATED",
      metadata: {
        workspaceName: workspace.name,
      },
    },
  });

  audit({
    action: "workspace.create",
    userId: input.ownerId,
    workspaceId: workspace.id,
  });

  return workspace;
}

export async function getWorkspaceAccessForUser(
  workspaceId: string,
  userId: string,
  database: WorkspaceAccessDatabase = db,
) {
  return database.workspace.findFirst({
    where: {
      id: workspaceId,
      memberships: {
        some: {
          userId,
        },
      },
    },
  });
}

export async function getWorkspaceAuthorizationForUser(
  workspaceId: string,
  userId: string,
  database: WorkspaceAccessDatabase = db,
) {
  const membership = await database.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!membership) {
    return null;
  }

  const workspace = await database.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    return null;
  }

  return {
    workspace,
    membership,
    isOwner: workspace.ownerId === userId || membership.role === "OWNER",
  };
}
