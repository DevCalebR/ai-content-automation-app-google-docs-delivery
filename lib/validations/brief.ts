import type { ContentBrief } from "@prisma/client";
import { z } from "zod";
import { splitListValue, titleFromBusiness } from "@/lib/utils";

export const briefFormFieldNames = [
  "workspaceId",
  "briefId",
  "presetId",
  "businessName",
  "niche",
  "offer",
  "audience",
  "brandVoice",
  "themes",
  "platforms",
  "cadence",
  "goals",
  "ctas",
  "promotions",
  "notes",
] as const;

const focusableBriefFieldNames = briefFormFieldNames.filter(
  (fieldName) => fieldName !== "workspaceId" && fieldName !== "briefId",
);

export type BriefFormFieldName = (typeof briefFormFieldNames)[number];

export type BriefFormValues = Record<BriefFormFieldName, string>;

export type BriefFieldErrors = Partial<Record<BriefFormFieldName, string>>;

export type SaveBriefState = {
  status: "idle" | "success" | "error";
  message?: string;
  values: BriefFormValues;
  fieldErrors: BriefFieldErrors;
  submissionId: number;
};

const listField = (message: string) =>
  z
    .string()
    .transform(splitListValue)
    .refine((value) => value.length > 0, message);

function normalizeFormValue(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" ? value : "";
}

export function buildBriefFormValues(
  input: Partial<Record<BriefFormFieldName, FormDataEntryValue | string | null | undefined>>,
): BriefFormValues {
  return {
    workspaceId: normalizeFormValue(input.workspaceId),
    briefId: normalizeFormValue(input.briefId),
    presetId: normalizeFormValue(input.presetId),
    businessName: normalizeFormValue(input.businessName),
    niche: normalizeFormValue(input.niche),
    offer: normalizeFormValue(input.offer),
    audience: normalizeFormValue(input.audience),
    brandVoice: normalizeFormValue(input.brandVoice),
    themes: normalizeFormValue(input.themes),
    platforms: normalizeFormValue(input.platforms),
    cadence: normalizeFormValue(input.cadence),
    goals: normalizeFormValue(input.goals),
    ctas: normalizeFormValue(input.ctas),
    promotions: normalizeFormValue(input.promotions),
    notes: normalizeFormValue(input.notes),
  };
}

export function buildBriefFormValuesFromBrief(
  workspaceId: string,
  brief?: ContentBrief | null,
): BriefFormValues {
  return {
    workspaceId,
    briefId: brief?.id ?? "",
    presetId: brief?.presetId ?? "",
    businessName: brief?.businessName ?? "",
    niche: brief?.niche ?? "",
    offer: brief?.offer ?? "",
    audience: brief?.audience ?? "",
    brandVoice: brief?.brandVoice ?? "",
    themes: brief?.themes.join(", ") ?? "",
    platforms: brief?.platforms.join(", ") ?? "",
    cadence: brief?.cadence ?? "",
    goals: brief?.goals.join(", ") ?? "",
    ctas: brief?.ctas.join(", ") ?? "",
    promotions: brief?.promotions.join(", ") ?? "",
    notes: brief?.notes ?? "",
  };
}

export function createInitialBriefState(values: BriefFormValues): SaveBriefState {
  return {
    status: "idle",
    values,
    fieldErrors: {},
    submissionId: 0,
  };
}

export function getBriefFieldErrors(
  error: z.ZodError<z.infer<typeof briefFormSchema>>,
): BriefFieldErrors {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: BriefFieldErrors = {};

  for (const fieldName of briefFormFieldNames) {
    const message = flattened[fieldName]?.[0];

    if (message) {
      fieldErrors[fieldName] = message;
    }
  }

  return fieldErrors;
}

export function getFirstBriefErrorField(fieldErrors: BriefFieldErrors) {
  return (
    focusableBriefFieldNames.find((fieldName) => Boolean(fieldErrors[fieldName])) ??
    briefFormFieldNames.find((fieldName) => Boolean(fieldErrors[fieldName]))
  );
}

export const briefFormSchema = z.object({
  workspaceId: z.string().min(1, "Workspace not found."),
  briefId: z.string(),
  presetId: z.string(),
  businessName: z
    .string()
    .trim()
    .min(2, "Enter the business name.")
    .max(120, "Keep the business name under 120 characters."),
  niche: z
    .string()
    .trim()
    .min(2, "Enter the niche.")
    .max(140, "Keep the niche under 140 characters."),
  offer: z
    .string()
    .trim()
    .min(10, "Describe the offer in a bit more detail.")
    .max(220, "Keep the offer under 220 characters."),
  audience: z
    .string()
    .trim()
    .min(10, "Describe the audience.")
    .max(220, "Keep the audience under 220 characters."),
  brandVoice: z
    .string()
    .trim()
    .min(10, "Describe the brand voice.")
    .max(220, "Keep the brand voice under 220 characters."),
  themes: listField("Add at least one theme."),
  platforms: listField("Add at least one platform."),
  cadence: z
    .string()
    .trim()
    .min(4, "Describe the publishing cadence.")
    .max(120, "Keep the cadence under 120 characters."),
  goals: listField("Add at least one goal."),
  ctas: listField("Add at least one call to action."),
  promotions: z.string().default("").transform(splitListValue),
  notes: z
    .string()
    .trim()
    .max(1000, "Keep the notes under 1000 characters."),
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
