import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/db";
import { logAuditEvent, logError } from "@/lib/logger";
import { buildRunDocxBuffer } from "@/lib/results/docx";
import {
  buildRunExportContent,
  downloadFormatSchema,
  getRunExportContentErrorMessage,
  isRunExportContentError,
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

function errorResponse(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return errorResponse("Sign in to download this export.", 401);
  }

  const { workspaceId, runId } = await params;
  const workspace = await getWorkspaceAccessForUser(
    workspaceId,
    session.user.id,
  );

  if (!workspace) {
    return errorResponse("This export link is no longer available.", 404);
  }

  const format = request.nextUrl.searchParams.get("format");
  const parsedFormat = downloadFormatSchema.safeParse(format);

  if (!parsedFormat.success) {
    return errorResponse("Choose a supported export format.", 400);
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
    return errorResponse(
      "This run does not have a saved result to export yet.",
      404,
    );
  }

  const formatKey = parsedFormat.data;
  let exportContent;

  try {
    exportContent = buildRunExportContent({
      businessName: run.brief.businessName,
      createdAt: run.createdAt,
      model: run.model,
      workspaceName: workspace.name,
      output: run.structuredOutput,
    });
  } catch (error) {
    if (isRunExportContentError(error)) {
      return errorResponse(
        getRunExportContentErrorMessage(error, "export"),
        error.code === "EMPTY_OUTPUT" ? 422 : 500,
      );
    }

    logError(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unknown export preparation error",
        runId: run.id,
        format: formatKey,
      },
      "run.export.prepare",
    );

    return errorResponse(
      "We couldn't prepare that export right now. Try again.",
      500,
    );
  }

  let body: string | Uint8Array;

  try {
    body =
      formatKey === "markdown"
        ? exportContent.markdown
        : formatKey === "text"
          ? exportContent.plainText
          : formatKey === "docx"
            ? new Uint8Array(await buildRunDocxBuffer(exportContent))
            : new Uint8Array(await buildRunPdfBuffer(exportContent));
  } catch (error) {
    logError(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unknown export generation error",
        runId: run.id,
        format: formatKey,
      },
      "run.export.generate",
    );

    return errorResponse(
      "We couldn't generate that export right now. Try again.",
      500,
    );
  }
  const responseConfig = exportResponseConfig[formatKey];
  const responseBody =
    typeof body === "string"
      ? body
      : body.slice().buffer;

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

  return new NextResponse(responseBody, {
    headers: {
      "Content-Disposition": `attachment; filename="${exportContent.fileStem}.${responseConfig.extension}"`,
      "Content-Type": responseConfig.contentType,
    },
  });
}
