import type { Prisma, StructuredOutput } from "@prisma/client";
import { z } from "zod";
import {
  captionSchema,
  hashtagSetSchema,
  imagePromptSchema,
  type Caption,
  type HashtagSet,
  type ImagePrompt,
} from "@/lib/validations/generation";

export const refinableSectionKeySchema = z.enum([
  "campaignSummary",
  "captions",
  "hashtags",
  "imagePrompts",
]);

export type RefinableSectionKey = z.infer<typeof refinableSectionKeySchema>;

export type RefinableSectionValueMap = {
  campaignSummary: string;
  captions: Caption[];
  hashtags: HashtagSet[];
  imagePrompts: ImagePrompt[];
};

export type RefinableSectionContent = RefinableSectionValueMap[RefinableSectionKey];

export type RefineSectionRequest<K extends RefinableSectionKey = RefinableSectionKey> = {
  workspaceId: string;
  runId: string;
  sectionKey: K;
  currentContent: RefinableSectionValueMap[K];
  instruction: string;
};

export type AcceptSectionRefinementRequest<
  K extends RefinableSectionKey = RefinableSectionKey,
> = {
  workspaceId: string;
  runId: string;
  sectionKey: K;
  revisedContent: RefinableSectionValueMap[K];
};

export type RefineSectionActionResult =
  | {
      status: "success";
      revisedContent: RefinableSectionContent;
    }
  | {
      status: "error";
      message: string;
    };

export const refinableSectionLabels: Record<RefinableSectionKey, string> = {
  campaignSummary: "Campaign summary",
  captions: "Captions",
  hashtags: "Hashtags",
  imagePrompts: "Image prompts",
};

const workspaceRunSchema = z.object({
  workspaceId: z.string().trim().min(1, "Workspace not found."),
  runId: z.string().trim().min(1, "Run not found."),
});

const instructionSchema = z
  .string()
  .trim()
  .min(1, "Enter a refinement instruction.");

const campaignSummarySchema = z
  .string()
  .trim()
  .min(1, "Campaign summary is missing.");
const captionsSchema = z.array(captionSchema).min(1, "Captions are missing.").max(8);
const hashtagsSchema = z.array(hashtagSetSchema).min(1, "Hashtags are missing.").max(5);
const imagePromptsSchema = z
  .array(imagePromptSchema)
  .min(1, "Image prompts are missing.")
  .max(8);

const refinableSectionContentSchemas = {
  campaignSummary: campaignSummarySchema,
  captions: captionsSchema,
  hashtags: hashtagsSchema,
  imagePrompts: imagePromptsSchema,
} as const;

const rawOutputSectionKeys: Record<RefinableSectionKey, string> = {
  campaignSummary: "campaignSummary",
  captions: "sampleCaptions",
  hashtags: "hashtags",
  imagePrompts: "imagePrompts",
};

function getFirstIssueMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid request.";
}

function parseSectionKey(sectionKey: unknown) {
  const parsed = refinableSectionKeySchema.safeParse(sectionKey);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

function parseSectionContent<K extends RefinableSectionKey>(
  sectionKey: K,
  content: unknown,
) {
  return refinableSectionContentSchemas[sectionKey].safeParse(content) as
    | {
        success: true;
        data: RefinableSectionValueMap[K];
      }
    | {
        success: false;
        error: z.ZodError;
      };
}

export function getRefinableSectionLabel(sectionKey: RefinableSectionKey) {
  return refinableSectionLabels[sectionKey];
}

export function buildRefinableSectionResponseSchema(sectionKey: RefinableSectionKey) {
  return z.object({
    revisedContent: refinableSectionContentSchemas[sectionKey],
  });
}

export function formatRefinableSectionContentForPrompt(
  sectionKey: RefinableSectionKey,
  content: RefinableSectionContent,
) {
  if (sectionKey === "campaignSummary" && typeof content === "string") {
    return content.trim();
  }

  return JSON.stringify(content, null, 2);
}

export function validateRefineSectionRequest(
  input: Record<string, unknown>,
):
  | {
      success: true;
      data: RefineSectionRequest;
    }
  | {
      success: false;
      message: string;
    } {
  const baseParsed = workspaceRunSchema.safeParse({
    workspaceId: input.workspaceId,
    runId: input.runId,
  });

  if (!baseParsed.success) {
    return {
      success: false,
      message: getFirstIssueMessage(baseParsed.error),
    };
  }

  const sectionKey = parseSectionKey(input.sectionKey);

  if (!sectionKey) {
    return {
      success: false,
      message: "This section can't be refined yet.",
    };
  }

  const instructionParsed = instructionSchema.safeParse(input.instruction);

  if (!instructionParsed.success) {
    return {
      success: false,
      message: getFirstIssueMessage(instructionParsed.error),
    };
  }

  const currentContentParsed = parseSectionContent(sectionKey, input.currentContent);

  if (!currentContentParsed.success) {
    return {
      success: false,
      message: `We couldn't read the saved ${getRefinableSectionLabel(sectionKey).toLowerCase()} for refinement.`,
    };
  }

  return {
    success: true,
    data: {
      ...baseParsed.data,
      sectionKey,
      currentContent: currentContentParsed.data,
      instruction: instructionParsed.data,
    },
  };
}

export function validateAcceptSectionRefinementRequest(
  input: Record<string, unknown>,
):
  | {
      success: true;
      data: AcceptSectionRefinementRequest;
    }
  | {
      success: false;
      message: string;
    } {
  const baseParsed = workspaceRunSchema.safeParse({
    workspaceId: input.workspaceId,
    runId: input.runId,
  });

  if (!baseParsed.success) {
    return {
      success: false,
      message: getFirstIssueMessage(baseParsed.error),
    };
  }

  const sectionKey = parseSectionKey(input.sectionKey);

  if (!sectionKey) {
    return {
      success: false,
      message: "This section can't be refined yet.",
    };
  }

  const revisedContentParsed = parseSectionContent(sectionKey, input.revisedContent);

  if (!revisedContentParsed.success) {
    return {
      success: false,
      message: "We couldn't save that revision.",
    };
  }

  return {
    success: true,
    data: {
      ...baseParsed.data,
      sectionKey,
      revisedContent: revisedContentParsed.data,
    },
  };
}

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJsonValue(content: RefinableSectionContent) {
  return content as Prisma.InputJsonValue;
}

function patchRawOutput(
  rawOutput: Prisma.JsonValue,
  sectionKey: RefinableSectionKey,
  content: RefinableSectionContent,
) {
  const nextRawOutput = (isJsonObject(rawOutput) ? { ...rawOutput } : {}) as Record<
    string,
    Prisma.InputJsonValue
  >;
  nextRawOutput[rawOutputSectionKeys[sectionKey]] = toJsonValue(content);

  return nextRawOutput as Prisma.InputJsonValue;
}

export function buildStructuredOutputSectionUpdate(
  structuredOutput: Pick<
    StructuredOutput,
    "campaignSummary" | "captions" | "hashtags" | "imagePrompts" | "rawOutput"
  >,
  sectionKey: RefinableSectionKey,
  content: RefinableSectionContent,
): Prisma.StructuredOutputUpdateInput {
  const rawOutput = patchRawOutput(structuredOutput.rawOutput, sectionKey, content);

  switch (sectionKey) {
    case "campaignSummary":
      return {
        campaignSummary: content as string,
        rawOutput: rawOutput as Prisma.InputJsonValue,
      };
    case "captions":
      return {
        captions: content as Caption[],
        rawOutput: rawOutput as Prisma.InputJsonValue,
      };
    case "hashtags":
      return {
        hashtags: content as HashtagSet[],
        rawOutput: rawOutput as Prisma.InputJsonValue,
      };
    case "imagePrompts":
      return {
        imagePrompts: content as ImagePrompt[],
        rawOutput: rawOutput as Prisma.InputJsonValue,
      };
  }
}
