import type { ContentBrief, Preset } from "@prisma/client";

export const PHASE1_SYSTEM_INSTRUCTIONS = `You are a senior lifecycle marketer creating structured campaign planning outputs for a SaaS application.
Return concise, commercially useful planning artifacts only.
Do not include markdown. Do not explain your reasoning.
Keep content grounded, specific, and safe for business use.
Avoid legal, medical, or financial claims unless the brief already provides compliant phrasing.`;

export function buildPresetInstructions(preset?: Preset | null) {
  if (!preset) {
    return "Use a balanced B2B growth-marketing approach with clear audience relevance and practical calls to action.";
  }

  return `${preset.systemInstructions}\n\n${preset.presetInstructions}`;
}

export function buildUserBrief(brief: ContentBrief) {
  return `Business name: ${brief.businessName}
Niche: ${brief.niche}
Offer: ${brief.offer}
Audience: ${brief.audience}
Brand voice: ${brief.brandVoice}
Themes: ${brief.themes.join(", ")}
Platforms: ${brief.platforms.join(", ")}
Cadence: ${brief.cadence}
Goals: ${brief.goals.join(", ")}
CTAs: ${brief.ctas.join(", ")}
Promotions: ${brief.promotions.join(", ")}
Notes: ${brief.notes ?? "None"}`;
}
