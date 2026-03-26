import type { StructuredOutput } from "@prisma/client";
import { z } from "zod";
import {
  type CalendarEntry,
  type Caption,
  type HashtagSet,
  type ImagePrompt,
} from "@/lib/validations/generation";
import { formatShortDate, slugify } from "@/lib/utils";

const exportTextSchema = z.string().trim().min(1);
const exportCalendarEntrySchema = z.object({
  day: exportTextSchema,
  platform: exportTextSchema,
  angle: exportTextSchema,
  callToAction: exportTextSchema,
});
const exportCaptionSchema = z.object({
  platform: exportTextSchema,
  headline: exportTextSchema,
  body: exportTextSchema,
});
const exportHashtagSetSchema = z.object({
  platform: exportTextSchema,
  tags: z.array(exportTextSchema).min(1).max(10),
});
const exportImagePromptSchema = z.object({
  assetType: exportTextSchema,
  prompt: exportTextSchema,
});

export class RunExportContentError extends Error {
  readonly code: "EMPTY_OUTPUT" | "MALFORMED_OUTPUT";

  constructor(code: "EMPTY_OUTPUT" | "MALFORMED_OUTPUT", message: string) {
    super(message);
    this.name = "RunExportContentError";
    this.code = code;
  }
}

export const downloadFormatSchema = z.enum(["markdown", "text", "docx", "pdf"]);

export type DownloadFormat = z.infer<typeof downloadFormatSchema>;

export type FormattedStructuredOutput = {
  campaignSummary: string;
  calendarEntries: CalendarEntry[];
  captions: Caption[];
  hashtags: HashtagSet[];
  imagePrompts: ImagePrompt[];
};

export type ResultsSectionKey =
  | "overview"
  | "calendar"
  | "captions"
  | "hashtags"
  | "imagePrompts";

export type ResultsSectionCopy = {
  key: ResultsSectionKey;
  label: string;
  copyText: string;
};

export type RunExportSectionItem = {
  title: string;
  lines: string[];
};

export type RunExportSection =
  | {
      key: "overview";
      title: string;
      kind: "paragraphs";
      paragraphs: string[];
    }
  | {
      key: Exclude<ResultsSectionKey, "overview">;
      title: string;
      kind: "items";
      items: RunExportSectionItem[];
    };

export type RunExportContent = {
  fileStem: string;
  title: string;
  generatedLabel: string;
  workspaceLabel?: string;
  formattedOutput: FormattedStructuredOutput;
  sections: RunExportSection[];
  copySections: Record<ResultsSectionKey, ResultsSectionCopy>;
  plainText: string;
  markdown: string;
  googleDocBlocks: Array<{
    kind: "title" | "subtitle" | "heading" | "body";
    text: string;
  }>;
};

type StoredOutputRecord = Pick<
  StructuredOutput,
  | "campaignSummary"
  | "calendarEntries"
  | "captions"
  | "hashtags"
  | "imagePrompts"
>;

type StructuredOutputNormalizationResult = {
  formattedOutput: FormattedStructuredOutput;
  hadInvalidData: boolean;
};

const sectionLabels: Record<ResultsSectionKey, string> = {
  overview: "Campaign summary",
  calendar: "Calendar",
  captions: "Captions",
  hashtags: "Hashtags",
  imagePrompts: "Image prompts",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStringField(value: unknown) {
  if (typeof value !== "string") {
    return {
      value: "",
      hadInvalidData: true,
    };
  }

  return {
    value: value.trim(),
    hadInvalidData: false,
  };
}

function normalizeArrayField<T>(value: unknown, schema: z.ZodType<T>) {
  if (!Array.isArray(value)) {
    return {
      value: [] as T[],
      hadInvalidData: true,
    };
  }

  let hadInvalidData = false;
  const normalizedItems: T[] = [];

  for (const item of value) {
    const parsed = schema.safeParse(item);

    if (parsed.success) {
      normalizedItems.push(parsed.data);
    } else {
      hadInvalidData = true;
    }
  }

  return {
    value: normalizedItems,
    hadInvalidData,
  };
}

function createCopySection(
  key: ResultsSectionKey,
  section: RunExportSection | null,
): ResultsSectionCopy {
  const label = sectionLabels[key];

  return {
    key,
    label,
    copyText: section
      ? `${label}\n\n${renderSectionPlainText(section)}`
      : `${label}\n\nNo saved content is available in this section.`,
  };
}

function buildOverviewSection(
  output: FormattedStructuredOutput,
): RunExportSection | null {
  if (!output.campaignSummary.trim()) {
    return null;
  }

  return {
    key: "overview",
    title: sectionLabels.overview,
    kind: "paragraphs",
    paragraphs: [output.campaignSummary.trim()],
  };
}

function buildCalendarSection(
  output: FormattedStructuredOutput,
): RunExportSection | null {
  if (!output.calendarEntries.length) {
    return null;
  }

  return {
    key: "calendar",
    title: sectionLabels.calendar,
    kind: "items",
    items: output.calendarEntries.map((entry, index) => ({
      title: `${index + 1}. ${entry.day} · ${entry.platform}`,
      lines: [`Angle: ${entry.angle}`, `CTA: ${entry.callToAction}`],
    })),
  };
}

function buildCaptionsSection(
  output: FormattedStructuredOutput,
): RunExportSection | null {
  if (!output.captions.length) {
    return null;
  }

  return {
    key: "captions",
    title: sectionLabels.captions,
    kind: "items",
    items: output.captions.map((caption, index) => ({
      title: `${index + 1}. ${caption.platform} · ${caption.headline}`,
      lines: [caption.body],
    })),
  };
}

function buildHashtagsSection(
  output: FormattedStructuredOutput,
): RunExportSection | null {
  if (!output.hashtags.length) {
    return null;
  }

  return {
    key: "hashtags",
    title: sectionLabels.hashtags,
    kind: "items",
    items: output.hashtags.map((set) => ({
      title: set.platform,
      lines: [set.tags.join(" ")],
    })),
  };
}

function buildImagePromptsSection(
  output: FormattedStructuredOutput,
): RunExportSection | null {
  if (!output.imagePrompts.length) {
    return null;
  }

  return {
    key: "imagePrompts",
    title: sectionLabels.imagePrompts,
    kind: "items",
    items: output.imagePrompts.map((prompt, index) => ({
      title: `${index + 1}. ${prompt.assetType}`,
      lines: [prompt.prompt],
    })),
  };
}

function renderSectionPlainText(section: RunExportSection) {
  if (section.kind === "paragraphs") {
    return section.paragraphs.join("\n\n");
  }

  return section.items
    .map((item) => [item.title, ...item.lines].join("\n"))
    .join("\n\n");
}

function renderSectionMarkdown(section: RunExportSection) {
  if (section.kind === "paragraphs") {
    return section.paragraphs.flatMap((paragraph) => [paragraph, ""]);
  }

  return section.items.flatMap((item) => [
    `### ${item.title}`,
    "",
    ...item.lines,
    "",
  ]);
}

function buildCopySections(output: FormattedStructuredOutput) {
  return {
    overview: createCopySection("overview", buildOverviewSection(output)),
    calendar: createCopySection("calendar", buildCalendarSection(output)),
    captions: createCopySection("captions", buildCaptionsSection(output)),
    hashtags: createCopySection("hashtags", buildHashtagsSection(output)),
    imagePrompts: createCopySection(
      "imagePrompts",
      buildImagePromptsSection(output),
    ),
  };
}

export function isRunExportContentError(
  error: unknown,
): error is RunExportContentError {
  return error instanceof RunExportContentError;
}

export function getRunExportContentErrorMessage(
  error: RunExportContentError,
  target: "results" | "export" | "delivery",
) {
  if (error.code === "EMPTY_OUTPUT") {
    switch (target) {
      case "results":
        return "This run does not have any saved content available to show yet.";
      case "delivery":
        return "This run does not have any saved content to deliver yet.";
      default:
        return "This run does not have any saved content to export yet.";
    }
  }

  switch (target) {
    case "results":
      return "This saved run result couldn't be displayed reliably. Regenerate the run or contact support.";
    case "delivery":
      return "This saved run result couldn't be prepared for Google Docs delivery. Regenerate the run or contact support.";
    default:
      return "This saved run result couldn't be prepared for export. Regenerate the run or contact support.";
  }
}

export function normalizeStructuredOutputRecord(
  output: StoredOutputRecord | unknown,
): StructuredOutputNormalizationResult {
  const source = isPlainObject(output) ? output : {};
  const campaignSummary = normalizeStringField(source.campaignSummary);
  const calendarEntries = normalizeArrayField(
    source.calendarEntries,
    exportCalendarEntrySchema,
  );
  const captions = normalizeArrayField(source.captions, exportCaptionSchema);
  const hashtags = normalizeArrayField(source.hashtags, exportHashtagSetSchema);
  const imagePrompts = normalizeArrayField(
    source.imagePrompts,
    exportImagePromptSchema,
  );

  return {
    formattedOutput: {
      campaignSummary: campaignSummary.value,
      calendarEntries: calendarEntries.value,
      captions: captions.value,
      hashtags: hashtags.value,
      imagePrompts: imagePrompts.value,
    },
    hadInvalidData:
      !isPlainObject(output) ||
      campaignSummary.hadInvalidData ||
      calendarEntries.hadInvalidData ||
      captions.hadInvalidData ||
      hashtags.hadInvalidData ||
      imagePrompts.hadInvalidData,
  };
}

export function parseStructuredOutputRecord(
  output: StoredOutputRecord,
): FormattedStructuredOutput {
  return normalizeStructuredOutputRecord(output).formattedOutput;
}

export function buildRunExportContent(input: {
  businessName: string;
  createdAt: Date;
  model: string;
  workspaceName?: string;
  output: StoredOutputRecord;
}): RunExportContent {
  const normalization = normalizeStructuredOutputRecord(input.output);
  const formattedOutput = normalization.formattedOutput;
  const title = `${input.businessName} content plan`;
  const generatedLabel = `Generated ${formatShortDate(input.createdAt)} with ${input.model}`;
  const workspaceLabel = input.workspaceName
    ? `Workspace: ${input.workspaceName}`
    : undefined;
  const sections: RunExportSection[] = [
    buildOverviewSection(formattedOutput),
    buildCalendarSection(formattedOutput),
    buildCaptionsSection(formattedOutput),
    buildHashtagsSection(formattedOutput),
    buildImagePromptsSection(formattedOutput),
  ].filter((section): section is RunExportSection => section !== null);

  if (!sections.length) {
    throw new RunExportContentError(
      normalization.hadInvalidData ? "MALFORMED_OUTPUT" : "EMPTY_OUTPUT",
      normalization.hadInvalidData
        ? "Saved run output is malformed."
        : "Saved run output is empty.",
    );
  }

  const copySections = buildCopySections(formattedOutput);

  const plainText = [
    title,
    ...(workspaceLabel ? [workspaceLabel] : []),
    generatedLabel,
    "",
    ...sections.flatMap((section) => [
      section.title,
      "",
      renderSectionPlainText(section),
      "",
    ]),
  ]
    .join("\n")
    .trim();

  const markdown = [
    `# ${title}`,
    "",
    ...(workspaceLabel ? [workspaceLabel, ""] : []),
    generatedLabel,
    "",
    ...sections.flatMap((section) => [
      `## ${section.title}`,
      "",
      ...renderSectionMarkdown(section),
    ]),
  ]
    .join("\n")
    .trim();

  const googleDocBlocks: RunExportContent["googleDocBlocks"] = [
    {
      kind: "title",
      text: title,
    },
    ...(workspaceLabel
      ? [
          {
            kind: "subtitle" as const,
            text: workspaceLabel,
          },
        ]
      : []),
    {
      kind: "subtitle",
      text: generatedLabel,
    },
    ...sections.flatMap((section) => [
      {
        kind: "heading" as const,
        text: section.title,
      },
      {
        kind: "body" as const,
        text: renderSectionPlainText(section),
      },
    ]),
  ];

  return {
    fileStem: `${slugify(input.businessName) || "content-plan"}-${input.createdAt.toISOString().slice(0, 10)}`,
    title,
    generatedLabel,
    workspaceLabel,
    formattedOutput,
    sections,
    copySections,
    plainText,
    markdown,
    googleDocBlocks,
  };
}
