import { z } from "zod";
import { splitListValue, titleFromBusiness } from "@/lib/utils";

const listField = z
  .string()
  .transform(splitListValue)
  .refine((value) => value.length > 0, "Add at least one item.");

export const briefFormSchema = z.object({
  workspaceId: z.string().min(1),
  briefId: z.string().optional(),
  presetId: z.string().optional().or(z.literal("")),
  businessName: z.string().trim().min(2).max(120),
  niche: z.string().trim().min(2).max(140),
  offer: z.string().trim().min(10).max(220),
  audience: z.string().trim().min(10).max(220),
  brandVoice: z.string().trim().min(10).max(220),
  themes: listField,
  platforms: listField,
  cadence: z.string().trim().min(4).max(120),
  goals: listField,
  ctas: listField,
  promotions: z.string().transform(splitListValue),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const runRequestSchema = z.object({
  workspaceId: z.string().min(1),
  briefId: z.string().min(1),
  presetId: z.string().optional().or(z.literal("")),
});

export function mapBriefParsedData(data: z.infer<typeof briefFormSchema>) {
  return {
    presetId: data.presetId || undefined,
    businessName: data.businessName,
    niche: data.niche,
    offer: data.offer,
    audience: data.audience,
    brandVoice: data.brandVoice,
    themes: data.themes,
    platforms: data.platforms,
    cadence: data.cadence,
    goals: data.goals,
    ctas: data.ctas,
    promotions: data.promotions,
    notes: data.notes || undefined,
    title: titleFromBusiness(data.businessName),
  };
}
