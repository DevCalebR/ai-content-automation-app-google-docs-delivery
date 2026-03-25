import type { ContentBrief, Preset, StructuredOutput } from "@prisma/client";
import { zodTextFormat } from "openai/helpers/zod";
import { openai } from "@/lib/ai/client";
import {
  buildPresetInstructions,
  buildUserBrief,
  PHASE1_SYSTEM_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { assertGenerationSafe } from "@/lib/ai/safety";
import { env } from "@/lib/env";
import {
  buildRefinableSectionResponseSchema,
  formatRefinableSectionContentForPrompt,
  getRefinableSectionLabel,
  type RefinableSectionContent,
  type RefinableSectionKey,
} from "@/lib/results/refinement";

type SupportingOutput = Pick<
  StructuredOutput,
  "campaignSummary" | "calendarEntries" | "captions" | "hashtags" | "imagePrompts"
>;

function buildSupportingRunContext(output: SupportingOutput) {
  return JSON.stringify(
    {
      campaignSummary: output.campaignSummary,
      calendarEntries: output.calendarEntries,
      captions: output.captions,
      hashtags: output.hashtags,
      imagePrompts: output.imagePrompts,
    },
    null,
    2,
  );
}

export async function refineRunSection(input: {
  brief: ContentBrief;
  currentContent: RefinableSectionContent;
  instruction: string;
  model?: string;
  preset?: Preset | null;
  sectionKey: RefinableSectionKey;
  supportingOutput: SupportingOutput;
}): Promise<RefinableSectionContent> {
  const compiledBrief = buildUserBrief(input.brief);
  const sectionLabel = getRefinableSectionLabel(input.sectionKey);

  assertGenerationSafe(`${compiledBrief}\n${input.instruction}`);

  const response = await openai.responses.parse({
    model: input.model ?? env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: `${PHASE1_SYSTEM_INSTRUCTIONS}

You refine one saved section at a time for a collaborative content planning workspace.`,
      },
      {
        role: "developer",
        content: `${buildPresetInstructions(input.preset)}

Revise only the requested ${sectionLabel} section.
Follow the user instruction closely.
Do not add commentary, rationale, markdown fences, or extra sections.
Preserve useful business, audience, offer, voice, and platform context from the brief and saved run.
Return clean section output only in the required schema.`,
      },
      {
        role: "user",
        content: `Brief context:
${compiledBrief}

Saved run context:
${buildSupportingRunContext(input.supportingOutput)}

Section to revise: ${sectionLabel}

Current ${sectionLabel}:
${formatRefinableSectionContentForPrompt(input.sectionKey, input.currentContent)}

User instruction:
${input.instruction}`,
      },
    ],
    text: {
      format: zodTextFormat(
        buildRefinableSectionResponseSchema(input.sectionKey),
        "section_refinement",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI returned an empty section refinement.");
  }

  return response.output_parsed.revisedContent;
}
