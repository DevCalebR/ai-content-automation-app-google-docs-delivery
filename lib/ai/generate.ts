import type { ContentBrief, Preset } from "@prisma/client";
import { zodTextFormat } from "openai/helpers/zod";
import { openai } from "@/lib/ai/client";
import {
  buildPresetInstructions,
  buildUserBrief,
  PHASE1_SYSTEM_INSTRUCTIONS,
} from "@/lib/ai/prompts";
import { assertGenerationSafe } from "@/lib/ai/safety";
import {
  generationOutputSchema,
  type GenerationOutput,
} from "@/lib/validations/generation";
import { env } from "@/lib/env";

export async function generateCampaignPlan({
  brief,
  preset,
}: {
  brief: ContentBrief;
  preset?: Preset | null;
}): Promise<GenerationOutput> {
  const compiledBrief = buildUserBrief(brief);

  assertGenerationSafe(compiledBrief);

  const response = await openai.responses.parse({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: PHASE1_SYSTEM_INSTRUCTIONS,
      },
      {
        role: "developer",
        content: buildPresetInstructions(preset),
      },
      {
        role: "user",
        content: `${compiledBrief}

Produce:
1. a short campaign summary
2. a one-week sample calendar
3. sample captions
4. hashtag sets
5. image prompts

Prioritize clarity, campaign coherence, and conversion readiness.`,
      },
    ],
    text: {
      format: zodTextFormat(generationOutputSchema, "campaign_plan"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("OpenAI returned an empty structured response.");
  }

  return response.output_parsed;
}
