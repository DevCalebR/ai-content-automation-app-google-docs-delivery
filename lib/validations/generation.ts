import { z } from "zod";

export const calendarEntrySchema = z.object({
  day: z.string(),
  platform: z.string(),
  angle: z.string(),
  callToAction: z.string(),
});

export const captionSchema = z.object({
  platform: z.string(),
  headline: z.string(),
  body: z.string(),
});

export const hashtagSetSchema = z.object({
  platform: z.string(),
  tags: z.array(z.string()).min(3).max(10),
});

export const imagePromptSchema = z.object({
  assetType: z.string(),
  prompt: z.string(),
});

export const generationOutputSchema = z.object({
  campaignSummary: z.string(),
  calendarEntries: z.array(calendarEntrySchema).min(3).max(10),
  sampleCaptions: z.array(captionSchema).min(2).max(8),
  hashtags: z.array(hashtagSetSchema).min(1).max(5),
  imagePrompts: z.array(imagePromptSchema).min(2).max(8),
});

export type CalendarEntry = z.infer<typeof calendarEntrySchema>;
export type Caption = z.infer<typeof captionSchema>;
export type HashtagSet = z.infer<typeof hashtagSetSchema>;
export type ImagePrompt = z.infer<typeof imagePromptSchema>;
export type GenerationOutput = z.infer<typeof generationOutputSchema>;
