import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/logger";
import { buildRunDocxBuffer } from "@/lib/results/docx";
import {
  buildRunExportContent,
  downloadFormatSchema,
  type DownloadFormat,
} from "@/lib/results/format";
import { buildRunPdfBuffer } from "@/lib/results/pdf";
import { getWorkspaceAccessForUser } from "@/lib/workspaces/service";

type RouteContext = {
  params: Promise<{ workspaceId: string; runId: string }>;
};

export const runtime = "nodejs";

const exportResponseConfig: Record<
  DownloadFormat,
  {
    contentType: string;
    extension: string;
  }
> = {
  markdown: {
    contentType: "text/markdown; charset=utf-8",
    extension: "md",
  },
  text: {
    contentType: "text/plain; charset=utf-8",
    extension: "txt",
  },
  docx: {
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
  },
  pdf: {
    contentType: "application/pdf",
    extension: "pdf",
  },
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
  const parsedFormat = downloadFormatSchema.safeParse(format);

  if (!parsedFormat.success) {
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
    workspaceName: workspace.name,
    output: run.structuredOutput,
  });
  const formatKey = parsedFormat.data;
  const body =
    formatKey === "markdown"
      ? exportContent.markdown
      : formatKey === "text"
        ? exportContent.plainText
        : formatKey === "docx"
          ? await buildRunDocxBuffer(exportContent)
          : await buildRunPdfBuffer(exportContent);
  const responseConfig = exportResponseConfig[formatKey];

  await db.usageEvent.create({
    data: {
      userId: session.user.id,
      workspaceId: workspace.id,
      type: "RUN_EXPORT_DOWNLOADED",
      metadata: {
        runId: run.id,
        format: formatKey,
      },
    },
  });

  logAuditEvent({
    action: "run.export.download",
    userId: session.user.id,
    workspaceId: workspace.id,
    metadata: {
      runId: run.id,
      format: formatKey,
    },
  });

  const responseBody = typeof body === "string" ? body : new Uint8Array(body);

  return new NextResponse(responseBody, {
    headers: {
      "Content-Disposition": `attachment; filename="${exportContent.fileStem}.${responseConfig.extension}"`,
      "Content-Type": responseConfig.contentType,
    },
  });
}
