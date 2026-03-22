import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/logger";
import { buildRunExportContent } from "@/lib/results/format";
import { getWorkspaceAccessForUser } from "@/lib/workspaces/service";

type RouteContext = {
  params: Promise<{ workspaceId: string; runId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { workspaceId, runId } = await params;
  const workspace = await getWorkspaceAccessForUser(workspaceId, session.user.id);

  if (!workspace) {
    return new NextResponse("Not found", { status: 404 });
  }

  const format = request.nextUrl.searchParams.get("format");

  if (format !== "markdown" && format !== "text") {
    return new NextResponse("Unsupported export format", { status: 400 });
  }

  const run = await db.generationRun.findFirst({
    where: {
      id: runId,
      workspaceId: workspace.id,
    },
    include: {
      brief: true,
      structuredOutput: true,
    },
  });

  if (!run?.structuredOutput) {
    return new NextResponse("Run output not found", { status: 404 });
  }

  const exportContent = buildRunExportContent({
    businessName: run.brief.businessName,
    createdAt: run.createdAt,
    model: run.model,
    output: run.structuredOutput,
  });
  const body = format === "markdown" ? exportContent.markdown : exportContent.plainText;
  const extension = format === "markdown" ? "md" : "txt";

  await db.usageEvent.create({
    data: {
      userId: session.user.id,
      workspaceId: workspace.id,
      type: "RUN_EXPORT_DOWNLOADED",
      metadata: {
        runId: run.id,
        format,
      },
    },
  });

  logAuditEvent({
    action: "run.export.download",
    userId: session.user.id,
    workspaceId: workspace.id,
    metadata: {
      runId: run.id,
      format,
    },
  });

  return new NextResponse(body, {
    headers: {
      "Content-Disposition": `attachment; filename="${exportContent.fileStem}.${extension}"`,
      "Content-Type":
        format === "markdown" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8",
    },
  });
}
