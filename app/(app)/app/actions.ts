"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { logAuditEvent, logError } from "@/lib/logger";
import { workspaceSchema } from "@/lib/validations/workspace";
import {
  briefFormSchema,
  buildBriefFormValues,
  getBriefFieldErrors,
  mapBriefParsedData,
  runRequestSchema,
  type SaveBriefState,
} from "@/lib/validations/brief";
import { assertRateLimitReady } from "@/lib/rate-limit";
import { generateCampaignPlan } from "@/lib/ai/generate";
import type { ActionState } from "@/components/ui/form-state";
import {
  buildGoogleDocsDocumentTitle,
  getGoogleDocsConnectionMetadata,
} from "@/lib/google-docs/connection";
import {
  initialGoogleDocsDeliveryState,
  initialGoogleDocsSettingsState,
  type GoogleDocsDeliveryState,
  type GoogleDocsSettingsState,
} from "@/lib/google-docs/state";
import {
  googleDocsConnectionFormSchema,
  googleDocsDeliveryRequestSchema,
} from "@/lib/validations/google-docs";
import {
  createWorkspaceWithOwner,
  getWorkspaceAccessForUser,
  getWorkspaceAuthorizationForUser,
} from "@/lib/workspaces/service";

const idleState: ActionState = {
  status: "idle",
};

export async function createWorkspaceAction(
  prevState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  void prevState;
  const session = await requireSession();
  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a workspace name.",
    };
  }

  const workspace = await createWorkspaceWithOwner({
    ownerId: session.user.id,
    name: parsed.data.name,
    description: parsed.data.description || undefined,
  });

  redirect(`/app/workspaces/${workspace.id}`);
}

export async function saveBriefAction(
  prevState: SaveBriefState,
  formData: FormData,
): Promise<SaveBriefState> {
  const session = await requireSession();
  const submittedValues = buildBriefFormValues({
    workspaceId: formData.get("workspaceId"),
    briefId: formData.get("briefId"),
    presetId: formData.get("presetId"),
    businessName: formData.get("businessName"),
    niche: formData.get("niche"),
    offer: formData.get("offer"),
    audience: formData.get("audience"),
    brandVoice: formData.get("brandVoice"),
    themes: formData.get("themes"),
    platforms: formData.get("platforms"),
    cadence: formData.get("cadence"),
    goals: formData.get("goals"),
    ctas: formData.get("ctas"),
    promotions: formData.get("promotions"),
    notes: formData.get("notes"),
  });
  const submissionId = prevState.submissionId + 1;

  const parsed = briefFormSchema.safeParse(submittedValues);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      values: submittedValues,
      fieldErrors: getBriefFieldErrors(parsed.error),
      submissionId,
    };
  }

  const workspace = await getWorkspaceAccessForUser(parsed.data.workspaceId, session.user.id);

  if (!workspace) {
    return {
      status: "error",
      message: "Workspace not found.",
      values: submittedValues,
      fieldErrors: {},
      submissionId,
    };
  }

  const briefValues = mapBriefParsedData(parsed.data);
  let savedBriefId = parsed.data.briefId;

  if (parsed.data.briefId) {
    const existingBrief = await db.contentBrief.findFirst({
      where: {
        id: parsed.data.briefId,
        workspaceId: workspace.id,
      },
    });

    if (!existingBrief) {
      return {
        status: "error",
        message: "Brief not found for this workspace.",
        values: submittedValues,
        fieldErrors: {},
        submissionId,
      };
    }

    await db.contentBrief.update({
      where: { id: existingBrief.id },
      data: {
        ...briefValues,
        status: "READY",
        briefSnapshot: briefValues,
      },
    });

    savedBriefId = existingBrief.id;
  } else {
    const createdBrief = await db.contentBrief.create({
      data: {
        workspaceId: workspace.id,
        authorId: session.user.id,
        status: "READY",
        ...briefValues,
        briefSnapshot: briefValues,
      },
    });

    savedBriefId = createdBrief.id;
  }

  await db.usageEvent.create({
    data: {
      userId: session.user.id,
      workspaceId: workspace.id,
      type: "BRIEF_SAVED",
    },
  });

  revalidatePath(`/app/workspaces/${workspace.id}`);
  revalidatePath(`/app/workspaces/${workspace.id}/generate`);

  return {
    status: "success",
    message: "Brief saved to the workspace.",
    values: {
      ...submittedValues,
      briefId: savedBriefId,
    },
    fieldErrors: {},
    submissionId,
  };
}

export async function duplicateBriefAction(formData: FormData) {
  const session = await requireSession();
  const briefId = String(formData.get("briefId") ?? "");

  const brief = await db.contentBrief.findFirst({
    where: {
      id: briefId,
      workspace: {
        memberships: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
  });

  if (!brief) {
    redirect("/app");
  }

  await db.contentBrief.create({
    data: {
      workspaceId: brief.workspaceId,
      authorId: session.user.id,
      presetId: brief.presetId,
      title: `${brief.businessName} monthly content brief`,
      status: "READY",
      businessName: brief.businessName,
      niche: brief.niche,
      offer: brief.offer,
      audience: brief.audience,
      brandVoice: brief.brandVoice,
      themes: brief.themes,
      platforms: brief.platforms,
      cadence: brief.cadence,
      goals: brief.goals,
      ctas: brief.ctas,
      promotions: brief.promotions,
      notes: brief.notes,
      briefSnapshot: (brief.briefSnapshot ?? {}) as Prisma.InputJsonValue,
    },
  });

  await db.usageEvent.create({
    data: {
      userId: session.user.id,
      workspaceId: brief.workspaceId,
      type: "BRIEF_DUPLICATED",
    },
  });

  revalidatePath(`/app/workspaces/${brief.workspaceId}`);
  redirect(`/app/workspaces/${brief.workspaceId}`);
}

export async function generateRunAction(formData: FormData) {
  const session = await requireSession();
  const parsed = runRequestSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    briefId: formData.get("briefId"),
    presetId: formData.get("presetId"),
  });

  if (!parsed.success) {
    redirect("/app");
  }

  const workspace = await getWorkspaceAccessForUser(parsed.data.workspaceId, session.user.id);

  if (!workspace) {
    redirect("/app");
  }

  const limiter = await assertRateLimitReady(`generate:${session.user.id}`);

  if (!limiter.allowed) {
    redirect(`/app/workspaces/${workspace.id}/generate?error=rate-limited`);
  }

  const brief = await db.contentBrief.findFirst({
    where: {
      id: parsed.data.briefId,
      workspaceId: workspace.id,
    },
  });

  if (!brief) {
    redirect(`/app/workspaces/${workspace.id}/generate?error=brief-missing`);
  }

  const preset = parsed.data.presetId
    ? await db.preset.findFirst({
        where: {
          id: parsed.data.presetId,
          OR: [{ isSystem: true }, { workspaceId: workspace.id }],
        },
      })
    : brief.presetId
      ? await db.preset.findUnique({
          where: { id: brief.presetId },
        })
      : null;

  const run = await db.generationRun.create({
    data: {
      workspaceId: workspace.id,
      briefId: brief.id,
      presetId: preset?.id,
      initiatedById: session.user.id,
      status: "RUNNING",
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    },
  });
  const resultsPath = `/app/workspaces/${workspace.id}/results/${run.id}`;

  await db.usageEvent.create({
    data: {
      userId: session.user.id,
      workspaceId: workspace.id,
      type: "GENERATION_REQUESTED",
      metadata: {
        runId: run.id,
      },
    },
  });

  try {
    const output = await generateCampaignPlan({
      brief,
      preset,
    });

    const structuredOutput = await db.structuredOutput.create({
      data: {
        workspaceId: workspace.id,
        runId: run.id,
        campaignSummary: output.campaignSummary,
        calendarEntries: output.calendarEntries,
        captions: output.sampleCaptions,
        hashtags: output.hashtags,
        imagePrompts: output.imagePrompts,
        rawOutput: output,
      },
    });

    await db.generationRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
        outputId: structuredOutput.id,
      },
    });

    await db.usageEvent.create({
      data: {
        userId: session.user.id,
        workspaceId: workspace.id,
        type: "GENERATION_COMPLETED",
        metadata: {
          runId: run.id,
        },
      },
    });

    revalidatePath(`/app/workspaces/${workspace.id}`);
    revalidatePath(`/app/workspaces/${workspace.id}/history`);
  } catch (error) {
    logError(error, "generation");

    await db.generationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Generation failed.",
        completedAt: new Date(),
      },
    });

    await db.usageEvent.create({
      data: {
        userId: session.user.id,
        workspaceId: workspace.id,
        type: "GENERATION_FAILED",
        metadata: {
          runId: run.id,
        },
      },
    });
  }

  redirect(resultsPath);
}

export async function updateWorkspaceSettingsAction(
  prevState: ActionState = idleState,
  formData: FormData,
): Promise<ActionState> {
  void prevState;
  const session = await requireSession();
  const workspaceId = String(formData.get("workspaceId") ?? "");

  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter valid workspace details.",
    };
  }

  const authorization = await getWorkspaceAuthorizationForUser(workspaceId, session.user.id);

  if (!authorization || !authorization.isOwner) {
    return {
      status: "error",
      message: "Only workspace owners can update settings.",
    };
  }

  await db.workspace.update({
    where: { id: authorization.workspace.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || undefined,
    },
  });

  revalidatePath(`/app/workspaces/${authorization.workspace.id}/settings`);
  revalidatePath(`/app/workspaces/${authorization.workspace.id}`);

  return {
    status: "success",
    message: "Workspace settings updated.",
  };
}

export async function saveGoogleDocsConnectionAction(
  prevState: GoogleDocsSettingsState = initialGoogleDocsSettingsState,
  formData: FormData,
): Promise<GoogleDocsSettingsState> {
  void prevState;
  const session = await requireSession();
  const submittedValues = {
    folderId: String(formData.get("folderId") ?? "").trim(),
    titlePrefix: String(formData.get("titlePrefix") ?? "").trim(),
  };
  const parsed = googleDocsConnectionFormSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    folderId: submittedValues.folderId,
    titlePrefix: submittedValues.titlePrefix,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid Google Drive folder ID.",
      values: submittedValues,
    };
  }

  const authorization = await getWorkspaceAuthorizationForUser(
    parsed.data.workspaceId,
    session.user.id,
  );

  if (!authorization || !authorization.isOwner) {
    return {
      status: "error",
      message: "Only workspace owners can update Google Docs delivery settings.",
      values: submittedValues,
    };
  }

  const { hasGoogleDocsServiceAccountConfig } = await import("@/lib/google-docs/client");

  if (!hasGoogleDocsServiceAccountConfig()) {
    return {
      status: "error",
      message:
        "Google Docs delivery is not configured on the server yet. Add the service account credentials before connecting a workspace folder.",
      values: submittedValues,
    };
  }

  try {
    const { validateGoogleDocsFolderAccess } = await import("@/lib/google-docs/service");
    const folder = await validateGoogleDocsFolderAccess(parsed.data.folderId);
    const metadata = {
      folderId: folder.folderId,
      folderName: folder.folderName,
      titlePrefix: parsed.data.titlePrefix?.trim() || undefined,
      configuredAt: new Date().toISOString(),
    };

    await db.integrationConnection.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: authorization.workspace.id,
          provider: "GOOGLE_DOCS",
        },
      },
      create: {
        workspaceId: authorization.workspace.id,
        userId: session.user.id,
        provider: "GOOGLE_DOCS",
        status: "CONNECTED",
        metadata,
      },
      update: {
        userId: session.user.id,
        status: "CONNECTED",
        metadata,
      },
    });

    logAuditEvent({
      action: "google_docs.connection.save",
      userId: session.user.id,
      workspaceId: authorization.workspace.id,
      metadata: {
        folderId: folder.folderId,
        folderName: folder.folderName,
      },
    });

    revalidatePath(`/app/workspaces/${authorization.workspace.id}/settings`);
    revalidatePath(`/app/workspaces/${authorization.workspace.id}/history`);

    return {
      status: "success",
      message: `Google Docs delivery is connected to ${folder.folderName}.`,
      values: {
        folderId: folder.folderId,
        titlePrefix: parsed.data.titlePrefix?.trim() || "",
      },
    };
  } catch (error) {
    logError(error, "google-docs.connection");

    await db.integrationConnection.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: authorization.workspace.id,
          provider: "GOOGLE_DOCS",
        },
      },
      create: {
        workspaceId: authorization.workspace.id,
        userId: session.user.id,
        provider: "GOOGLE_DOCS",
        status: "ERROR",
        metadata: {
          folderId: parsed.data.folderId,
          titlePrefix: parsed.data.titlePrefix?.trim() || undefined,
          configuredAt: new Date().toISOString(),
        },
      },
      update: {
        userId: session.user.id,
        status: "ERROR",
        metadata: {
          folderId: parsed.data.folderId,
          titlePrefix: parsed.data.titlePrefix?.trim() || undefined,
          configuredAt: new Date().toISOString(),
        },
      },
    });

    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "We couldn’t validate access to that Google Drive folder.",
      values: submittedValues,
    };
  }
}

export async function deliverRunToGoogleDocsAction(
  prevState: GoogleDocsDeliveryState = initialGoogleDocsDeliveryState,
  formData: FormData,
): Promise<GoogleDocsDeliveryState> {
  void prevState;
  const session = await requireSession();
  const parsed = googleDocsDeliveryRequestSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    runId: formData.get("runId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "We couldn’t start Google Docs delivery for this run.",
    };
  }

  const authorization = await getWorkspaceAuthorizationForUser(
    parsed.data.workspaceId,
    session.user.id,
  );

  if (!authorization || !authorization.isOwner) {
    return {
      status: "error",
      message: "Only workspace owners can deliver results to Google Docs.",
    };
  }

  const run = await db.generationRun.findFirst({
    where: {
      id: parsed.data.runId,
      workspaceId: authorization.workspace.id,
    },
    include: {
      brief: true,
      structuredOutput: true,
    },
  });

  if (!run || !run.structuredOutput) {
    return {
      status: "error",
      message: "This run does not have a completed result to deliver yet.",
    };
  }

  const connection = await db.integrationConnection.findFirst({
    where: {
      workspaceId: authorization.workspace.id,
      provider: "GOOGLE_DOCS",
    },
  });
  const connectionMetadata = getGoogleDocsConnectionMetadata(connection);

  if (!connectionMetadata) {
    return {
      status: "error",
      message: "Connect Google Docs delivery in workspace settings before delivering a run.",
    };
  }

  const deliveryTitle = buildGoogleDocsDocumentTitle({
    businessName: run.brief.businessName,
    createdAt: run.createdAt,
    titlePrefix: connectionMetadata.titlePrefix,
  });

  await db.runDelivery.upsert({
    where: {
      runId_provider: {
        runId: run.id,
        provider: "GOOGLE_DOCS",
      },
    },
    create: {
      runId: run.id,
      workspaceId: authorization.workspace.id,
      initiatedById: session.user.id,
      provider: "GOOGLE_DOCS",
      status: "PENDING",
      title: deliveryTitle,
      metadata: connectionMetadata as Prisma.InputJsonValue,
    },
    update: {
      initiatedById: session.user.id,
      status: "PENDING",
      title: deliveryTitle,
      errorMessage: null,
      metadata: connectionMetadata as Prisma.InputJsonValue,
    },
  });

  logAuditEvent({
    action: "google_docs.delivery.started",
    userId: session.user.id,
    workspaceId: authorization.workspace.id,
    metadata: {
      runId: run.id,
      folderId: connectionMetadata.folderId,
      title: deliveryTitle,
    },
  });

  try {
    const { deliverStructuredOutputToGoogleDocs } = await import("@/lib/google-docs/delivery");
    const deliveredDocument = await deliverStructuredOutputToGoogleDocs({
      businessName: run.brief.businessName,
      createdAt: run.createdAt,
      model: run.model,
      output: run.structuredOutput,
      connectionMetadata,
    });

    await db.runDelivery.update({
      where: {
        runId_provider: {
          runId: run.id,
          provider: "GOOGLE_DOCS",
        },
      },
      data: {
        status: "DELIVERED",
        title: deliveredDocument.title,
        externalId: deliveredDocument.documentId,
        externalUrl: deliveredDocument.url,
        errorMessage: null,
        deliveredAt: new Date(),
      },
    });

    await db.usageEvent.create({
      data: {
        userId: session.user.id,
        workspaceId: authorization.workspace.id,
        type: "RUN_DELIVERED",
        metadata: {
          runId: run.id,
          provider: "GOOGLE_DOCS",
          documentId: deliveredDocument.documentId,
        },
      },
    });

    logAuditEvent({
      action: "google_docs.delivery.succeeded",
      userId: session.user.id,
      workspaceId: authorization.workspace.id,
      metadata: {
        runId: run.id,
        documentId: deliveredDocument.documentId,
      },
    });

    revalidatePath(`/app/workspaces/${authorization.workspace.id}/results/${run.id}`);
    revalidatePath(`/app/workspaces/${authorization.workspace.id}/history`);

    return {
      status: "success",
      message: "Run delivered to Google Docs.",
      documentUrl: deliveredDocument.url,
    };
  } catch (error) {
    const { isGoogleDocsDeliveryError } = await import("@/lib/google-docs/service");
    const googleDocsError = isGoogleDocsDeliveryError(error) ? error : null;
    const errorContext = googleDocsError
      ? `google-docs.${googleDocsError.stage}`
      : "google-docs.delivery";
    const errorMessage =
      error instanceof Error ? error.message : "Google Docs delivery failed.";

    logError(
      googleDocsError
        ? {
            name: googleDocsError.name,
            message: googleDocsError.message,
            stage: googleDocsError.stage,
            kind: googleDocsError.kind,
            details: googleDocsError.details,
            runId: run.id,
          }
        : {
            message: errorMessage,
            runId: run.id,
          },
      errorContext,
    );
    logAuditEvent({
      action: "google_docs.delivery.failed",
      userId: session.user.id,
      workspaceId: authorization.workspace.id,
      metadata: {
        runId: run.id,
        stage: googleDocsError?.stage ?? "unknown",
        kind: googleDocsError?.kind ?? "unknown",
      },
    });

    await db.runDelivery.update({
      where: {
        runId_provider: {
          runId: run.id,
          provider: "GOOGLE_DOCS",
        },
      },
      data: {
        status: "FAILED",
        errorMessage: errorMessage,
      },
    });

    await db.usageEvent.create({
      data: {
        userId: session.user.id,
        workspaceId: authorization.workspace.id,
        type: "RUN_DELIVERY_FAILED",
        metadata: {
          runId: run.id,
          provider: "GOOGLE_DOCS",
        },
      },
    });

    revalidatePath(`/app/workspaces/${authorization.workspace.id}/results/${run.id}`);
    revalidatePath(`/app/workspaces/${authorization.workspace.id}/history`);

    return {
      status: "error",
      message: errorMessage,
    };
  }
}
