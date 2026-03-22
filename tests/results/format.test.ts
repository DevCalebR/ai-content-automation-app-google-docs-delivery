import { describe, expect, it } from "vitest";
import { buildRunExportContent } from "@/lib/results/format";

describe("buildRunExportContent", () => {
  it("creates deterministic copy, markdown, and plain-text exports from a saved run", () => {
    const exportContent = buildRunExportContent({
      businessName: "North Star Media",
      createdAt: new Date("2026-03-22T12:00:00.000Z"),
      model: "gpt-5.4-mini",
      output: {
        campaignSummary: "Focus the month on client wins and lead capture.",
        calendarEntries: [
          {
            day: "Monday",
            platform: "LinkedIn",
            angle: "Client win spotlight",
            callToAction: "Book a strategy call",
          },
        ],
        captions: [
          {
            platform: "LinkedIn",
            headline: "Show the before and after",
            body: "Turn one client win into a stronger proof-driven post.",
          },
        ],
        hashtags: [
          {
            platform: "LinkedIn",
            tags: ["#contentops", "#b2bmarketing", "#leadgen"],
          },
        ],
        imagePrompts: [
          {
            assetType: "Static post",
            prompt: "Warm editorial layout with client metrics and muted brand tones.",
          },
        ],
      },
    });

    expect(exportContent.fileStem).toBe("north-star-media-2026-03-22");
    expect(exportContent.copySections.calendar.copyText).toContain("Monday · LinkedIn");
    expect(exportContent.plainText).toContain("Campaign summary");
    expect(exportContent.plainText).toContain("Book a strategy call");
    expect(exportContent.markdown).toContain("# North Star Media content plan");
    expect(exportContent.markdown).toContain("## Image prompts");
    expect(exportContent.googleDocBlocks.map((block) => block.kind)).toEqual([
      "title",
      "subtitle",
      "heading",
      "body",
      "heading",
      "body",
      "heading",
      "body",
      "heading",
      "body",
      "heading",
      "body",
    ]);
  });
});
