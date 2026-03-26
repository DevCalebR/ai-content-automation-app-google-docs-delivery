import { describe, expect, it } from "vitest";
import {
  buildRunExportContent,
  RunExportContentError,
} from "@/lib/results/format";

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
            prompt:
              "Warm editorial layout with client metrics and muted brand tones.",
          },
        ],
      },
    });

    expect(exportContent.fileStem).toBe("north-star-media-2026-03-22");
    expect(exportContent.copySections.calendar.copyText).toContain(
      "Monday · LinkedIn",
    );
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

  it("uses the latest saved section content in exports after a refinement is accepted", () => {
    const exportContent = buildRunExportContent({
      businessName: "North Star Media",
      createdAt: new Date("2026-03-22T12:00:00.000Z"),
      model: "gpt-5.4-mini",
      output: {
        campaignSummary: "Refined summary for a more operator-focused angle.",
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
            headline: "Refined headline",
            body: "Refined caption body for the accepted revision.",
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
            prompt: "Refined image prompt for the accepted revision.",
          },
        ],
      },
    });

    expect(exportContent.plainText).toContain(
      "Refined summary for a more operator-focused angle.",
    );
    expect(exportContent.markdown).toContain(
      "Refined caption body for the accepted revision.",
    );
    expect(
      exportContent.googleDocBlocks.some((block) =>
        block.text.includes("Refined image prompt"),
      ),
    ).toBe(true);
  });

  it("normalizes partial saved output without dropping unrelated valid sections", () => {
    const exportContent = buildRunExportContent({
      businessName: "North Star Media",
      createdAt: new Date("2026-03-22T12:00:00.000Z"),
      model: "gpt-5.4-mini",
      workspaceName: "Client Delivery",
      output: {
        campaignSummary: "   ",
        calendarEntries: [
          {
            day: "Monday",
            platform: "LinkedIn",
            angle: "Client win spotlight",
            callToAction: "Book a strategy call",
          },
          {
            day: "",
            platform: "LinkedIn",
            angle: "Invalid row",
            callToAction: "Ignore this row",
          },
        ],
        captions: "invalid",
        hashtags: [
          {
            platform: "LinkedIn",
            tags: ["#contentops", "#retainer"],
          },
        ],
        imagePrompts: [
          {
            assetType: "Static post",
            prompt: "Refined image prompt from the saved result.",
          },
          {
            assetType: "",
            prompt: "Ignore this prompt",
          },
        ],
      } as never,
    });

    expect(exportContent.sections.map((section) => section.key)).toEqual([
      "calendar",
      "hashtags",
      "imagePrompts",
    ]);
    expect(exportContent.plainText).toContain("Monday · LinkedIn");
    expect(exportContent.plainText).toContain("#contentops #retainer");
    expect(exportContent.plainText).toContain(
      "Refined image prompt from the saved result.",
    );
    expect(exportContent.plainText).not.toContain("Captions");
    expect(exportContent.markdown).not.toContain("## Campaign summary");
    expect(exportContent.copySections.captions.copyText).toContain(
      "No saved content is available in this section.",
    );
    expect(
      exportContent.googleDocBlocks.some((block) => block.text === "Captions"),
    ).toBe(false);
  });

  it("fails with an empty-output error when no exportable content is saved", () => {
    let capturedError: unknown;

    try {
      buildRunExportContent({
        businessName: "North Star Media",
        createdAt: new Date("2026-03-22T12:00:00.000Z"),
        model: "gpt-5.4-mini",
        output: {
          campaignSummary: "   ",
          calendarEntries: [],
          captions: [],
          hashtags: [],
          imagePrompts: [],
        },
      });
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(RunExportContentError);
    expect((capturedError as RunExportContentError).code).toBe("EMPTY_OUTPUT");
  });

  it("fails with a malformed-output error when persisted data has no usable sections", () => {
    let capturedError: unknown;

    try {
      buildRunExportContent({
        businessName: "North Star Media",
        createdAt: new Date("2026-03-22T12:00:00.000Z"),
        model: "gpt-5.4-mini",
        output: {
          campaignSummary: 42,
          calendarEntries: "invalid",
          captions: null,
          hashtags: [{ platform: "", tags: [] }],
          imagePrompts: undefined,
        } as never,
      });
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(RunExportContentError);
    expect((capturedError as RunExportContentError).code).toBe(
      "MALFORMED_OUTPUT",
    );
  });
});
