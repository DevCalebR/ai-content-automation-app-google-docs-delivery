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

export type RunExportContent = {
  fileStem: string;
  title: string;
  generatedLabel: string;
  formattedOutput: FormattedStructuredOutput;
  copySections: Record<ResultsSectionKey, ResultsSectionCopy>;
  plainText: string;
  markdown: string;
  googleDocBlocks: Array<{ kind: "title" | "subtitle" | "heading" | "body"; text: string }>;
};

function formatCalendarSection(entries: CalendarEntry[]) {
  return entries
    .map(
      (entry, index) =>
        `${index + 1}. ${entry.day} · ${entry.platform}\nAngle: ${entry.angle}\nCTA: ${entry.callToAction}`,
    )
    .join("\n\n");
}

function formatCaptionsSection(captions: Caption[]) {
  return captions
    .map(
      (caption, index) =>
        `${index + 1}. ${caption.platform} · ${caption.headline}\n${caption.body}`,
    )
    .join("\n\n");
}

function formatHashtagsSection(hashtags: HashtagSet[]) {
  return hashtags
    .map((set) => `${set.platform}\n${set.tags.join(" ")}`)
    .join("\n\n");
}

function formatImagePromptsSection(imagePrompts: ImagePrompt[]) {
  return imagePrompts
    .map((prompt, index) => `${index + 1}. ${prompt.assetType}\n${prompt.prompt}`)
    .join("\n\n");
}

export function parseStructuredOutputRecord(output: Pick<
  StructuredOutput,
  "campaignSummary" | "calendarEntries" | "captions" | "hashtags" | "imagePrompts"
>): FormattedStructuredOutput {
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
  output: Pick<
    StructuredOutput,
    "campaignSummary" | "calendarEntries" | "captions" | "hashtags" | "imagePrompts"
  >;
}) : RunExportContent {
  const formattedOutput = parseStructuredOutputRecord(input.output);
  const title = `${input.businessName} content plan`;
  const generatedLabel = `Generated ${formatShortDate(input.createdAt)} with ${input.model}`;
  const overviewText = formattedOutput.campaignSummary.trim();
  const calendarText = formatCalendarSection(formattedOutput.calendarEntries);
  const captionsText = formatCaptionsSection(formattedOutput.captions);
  const hashtagsText = formatHashtagsSection(formattedOutput.hashtags);
  const imagePromptsText = formatImagePromptsSection(formattedOutput.imagePrompts);

  const copySections: Record<ResultsSectionKey, ResultsSectionCopy> = {
    overview: {
      key: "overview",
      label: "Campaign summary",
      copyText: `Campaign summary\n\n${overviewText}`,
    },
    calendar: {
      key: "calendar",
      label: "Calendar",
      copyText: `Calendar\n\n${calendarText}`,
    },
    captions: {
      key: "captions",
      label: "Captions",
      copyText: `Captions\n\n${captionsText}`,
    },
    hashtags: {
      key: "hashtags",
      label: "Hashtags",
      copyText: `Hashtags\n\n${hashtagsText}`,
    },
    imagePrompts: {
      key: "imagePrompts",
      label: "Image prompts",
      copyText: `Image prompts\n\n${imagePromptsText}`,
    },
  };

  const plainText = [
    title,
    generatedLabel,
    "",
    copySections.overview.copyText,
    "",
    copySections.calendar.copyText,
    "",
    copySections.captions.copyText,
    "",
    copySections.hashtags.copyText,
    "",
    copySections.imagePrompts.copyText,
  ].join("\n");

  const markdown = [
    `# ${title}`,
    "",
    generatedLabel,
    "",
    "## Campaign summary",
    "",
    overviewText,
    "",
    "## Calendar",
    "",
    ...formattedOutput.calendarEntries.flatMap((entry, index) => [
      `### ${index + 1}. ${entry.day} · ${entry.platform}`,
      "",
      `- Angle: ${entry.angle}`,
      `- CTA: ${entry.callToAction}`,
      "",
    ]),
    "## Captions",
    "",
    ...formattedOutput.captions.flatMap((caption, index) => [
      `### ${index + 1}. ${caption.platform} · ${caption.headline}`,
      "",
      caption.body,
      "",
    ]),
    "## Hashtags",
    "",
    ...formattedOutput.hashtags.flatMap((set) => [
      `### ${set.platform}`,
      "",
      set.tags.join(" "),
      "",
    ]),
    "## Image prompts",
    "",
    ...formattedOutput.imagePrompts.flatMap((prompt, index) => [
      `### ${index + 1}. ${prompt.assetType}`,
      "",
      prompt.prompt,
      "",
    ]),
  ]
    .join("\n")
    .trim();

  const googleDocBlocks: RunExportContent["googleDocBlocks"] = [
    {
      kind: "title",
      text: title,
    },
    {
      kind: "subtitle",
      text: generatedLabel,
    },
    {
      kind: "heading",
      text: "Campaign summary",
    },
    {
      kind: "body",
      text: overviewText,
    },
    {
      kind: "heading",
      text: "Calendar",
    },
    {
      kind: "body",
      text: calendarText,
    },
    {
      kind: "heading",
      text: "Captions",
    },
    {
      kind: "body",
      text: captionsText,
    },
    {
      kind: "heading",
      text: "Hashtags",
    },
    {
      kind: "body",
      text: hashtagsText,
    },
    {
      kind: "heading",
      text: "Image prompts",
    },
    {
      kind: "body",
      text: imagePromptsText,
    },
  ];

  return {
    fileStem: `${slugify(input.businessName) || "content-plan"}-${input.createdAt.toISOString().slice(0, 10)}`,
    title,
    generatedLabel,
    formattedOutput,
    copySections,
    plainText,
    markdown,
    googleDocBlocks,
  };
}
