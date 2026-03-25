import type { StructuredOutput } from "@prisma/client";
import { z } from "zod";
import {
  calendarEntrySchema,
  captionSchema,
  hashtagSetSchema,
  imagePromptSchema,
  type CalendarEntry,
  type Caption,
  type HashtagSet,
  type ImagePrompt,
} from "@/lib/validations/generation";
import { formatShortDate, slugify } from "@/lib/utils";

const storedStructuredOutputSchema = z.object({
  campaignSummary: z.string().min(1),
  calendarEntries: z.array(calendarEntrySchema),
  captions: z.array(captionSchema),
  hashtags: z.array(hashtagSetSchema),
  imagePrompts: z.array(imagePromptSchema),
});

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
  googleDocBlocks: Array<{ kind: "title" | "subtitle" | "heading" | "body"; text: string }>;
};

function buildOverviewSection(output: FormattedStructuredOutput): RunExportSection {
  return {
    key: "overview",
    title: "Campaign summary",
    kind: "paragraphs",
    paragraphs: [output.campaignSummary.trim()],
  };
}

function buildCalendarSection(output: FormattedStructuredOutput): RunExportSection {
  return {
    key: "calendar",
    title: "Calendar",
    kind: "items",
    items: output.calendarEntries.map((entry, index) => ({
      title: `${index + 1}. ${entry.day} · ${entry.platform}`,
      lines: [`Angle: ${entry.angle}`, `CTA: ${entry.callToAction}`],
    })),
  };
}

function buildCaptionsSection(output: FormattedStructuredOutput): RunExportSection {
  return {
    key: "captions",
    title: "Captions",
    kind: "items",
    items: output.captions.map((caption, index) => ({
      title: `${index + 1}. ${caption.platform} · ${caption.headline}`,
      lines: [caption.body],
    })),
  };
}

function buildHashtagsSection(output: FormattedStructuredOutput): RunExportSection {
  return {
    key: "hashtags",
    title: "Hashtags",
    kind: "items",
    items: output.hashtags.map((set) => ({
      title: set.platform,
      lines: [set.tags.join(" ")],
    })),
  };
}

function buildImagePromptsSection(output: FormattedStructuredOutput): RunExportSection {
  return {
    key: "imagePrompts",
    title: "Image prompts",
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

function buildCopySections(sections: RunExportSection[]) {
  return sections.reduce<Record<ResultsSectionKey, ResultsSectionCopy>>((accumulator, section) => {
    accumulator[section.key] = {
      key: section.key,
      label: section.title,
      copyText: `${section.title}\n\n${renderSectionPlainText(section)}`,
    };

    return accumulator;
  }, {} as Record<ResultsSectionKey, ResultsSectionCopy>);
}

export function parseStructuredOutputRecord(
  output: Pick<
    StructuredOutput,
    "campaignSummary" | "calendarEntries" | "captions" | "hashtags" | "imagePrompts"
  >,
): FormattedStructuredOutput {
  return storedStructuredOutputSchema.parse({
    campaignSummary: output.campaignSummary,
    calendarEntries: output.calendarEntries,
    captions: output.captions,
    hashtags: output.hashtags,
    imagePrompts: output.imagePrompts,
  });
}

export function buildRunExportContent(input: {
  businessName: string;
  createdAt: Date;
  model: string;
  workspaceName?: string;
  output: Pick<
    StructuredOutput,
    "campaignSummary" | "calendarEntries" | "captions" | "hashtags" | "imagePrompts"
  >;
}): RunExportContent {
  const formattedOutput = parseStructuredOutputRecord(input.output);
  const title = `${input.businessName} content plan`;
  const generatedLabel = `Generated ${formatShortDate(input.createdAt)} with ${input.model}`;
  const workspaceLabel = input.workspaceName ? `Workspace: ${input.workspaceName}` : undefined;
  const sections: RunExportSection[] = [
    buildOverviewSection(formattedOutput),
    buildCalendarSection(formattedOutput),
    buildCaptionsSection(formattedOutput),
    buildHashtagsSection(formattedOutput),
    buildImagePromptsSection(formattedOutput),
  ];
  const copySections = buildCopySections(sections);

  const plainText = [
    title,
    ...(workspaceLabel ? [workspaceLabel] : []),
    generatedLabel,
    "",
    ...sections.flatMap((section) => [section.title, "", renderSectionPlainText(section), ""]),
  ]
    .join("\n")
    .trim();

  const markdown = [
    `# ${title}`,
    "",
    ...(workspaceLabel ? [workspaceLabel, ""] : []),
    generatedLabel,
    "",
    ...sections.flatMap((section) => [`## ${section.title}`, "", ...renderSectionMarkdown(section)]),
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
