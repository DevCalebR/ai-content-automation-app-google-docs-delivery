import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildRunExportContent } from "@/lib/results/format";

const createGoogleDocsDeliveryMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/google-docs/service", () => ({
  createGoogleDocsDelivery: createGoogleDocsDeliveryMock,
}));

describe("deliverStructuredOutputToGoogleDocs", () => {
  beforeEach(() => {
    createGoogleDocsDeliveryMock.mockReset();
    createGoogleDocsDeliveryMock.mockResolvedValue({
      documentId: "doc-1",
      title: "North Star · North Star Media content plan · Mar 22, 2026",
      url: "https://docs.google.com/document/d/doc-1/edit",
    });
  });

  it("builds Google Docs blocks from the shared normalized export content", async () => {
    const { deliverStructuredOutputToGoogleDocs } =
      await import("@/lib/google-docs/delivery");
    const input = {
      businessName: "North Star Media",
      workspaceName: "Client Delivery",
      createdAt: new Date("2026-03-22T12:00:00.000Z"),
      model: "gpt-5.4-mini",
      output: {
        campaignSummary: "Refined summary for the accepted section revision.",
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
            body: "Refined caption body from the saved result.",
          },
        ],
        hashtags: [
          {
            platform: "LinkedIn",
            tags: ["#contentops", "#retainer", "#agencygrowth"],
          },
        ],
        imagePrompts: [
          {
            assetType: "Static post",
            prompt: "Refined image prompt from the saved result.",
          },
        ],
      },
      connectionMetadata: {
        authMode: "SERVICE_ACCOUNT" as const,
        folderId: "folder-123",
        folderName: "Content Delivery",
        titlePrefix: "North Star",
        configuredAt: "2026-03-22T12:00:00.000Z",
      },
    };

    await deliverStructuredOutputToGoogleDocs(input);

    expect(createGoogleDocsDeliveryMock).toHaveBeenCalledWith({
      title: "North Star · North Star Media content plan · Mar 22, 2026",
      folderId: "folder-123",
      blocks: buildRunExportContent({
        businessName: input.businessName,
        workspaceName: input.workspaceName,
        createdAt: input.createdAt,
        model: input.model,
        output: input.output,
      }).googleDocBlocks,
      authMode: "SERVICE_ACCOUNT",
      docsClient: undefined,
      driveClient: undefined,
    });
  });

  it("normalizes partial saved output before creating Google Docs blocks", async () => {
    const { deliverStructuredOutputToGoogleDocs } =
      await import("@/lib/google-docs/delivery");

    await deliverStructuredOutputToGoogleDocs({
      businessName: "North Star Media",
      workspaceName: "Client Delivery",
      createdAt: new Date("2026-03-22T12:00:00.000Z"),
      model: "gpt-5.4-mini",
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
            angle: "Ignore this row",
            callToAction: "Ignore this CTA",
          },
        ],
        captions: "invalid",
        hashtags: [
          {
            platform: "LinkedIn",
            tags: ["#contentops", "#retainer"],
          },
        ],
        imagePrompts: null,
      } as never,
      connectionMetadata: {
        authMode: "SERVICE_ACCOUNT",
        folderId: "folder-123",
        folderName: "Content Delivery",
        titlePrefix: "North Star",
        configuredAt: "2026-03-22T12:00:00.000Z",
      },
    });

    const blocks = createGoogleDocsDeliveryMock.mock.calls[0]?.[0]
      ?.blocks as Array<{
      kind: string;
      text: string;
    }>;

    expect(blocks.map((block) => block.text)).toEqual(
      expect.arrayContaining([
        "Workspace: Client Delivery",
        "Calendar",
        "Hashtags",
      ]),
    );
    expect(blocks.some((block) => block.text === "Captions")).toBe(false);
    expect(blocks.some((block) => block.text === "Image prompts")).toBe(false);
    expect(
      blocks.some((block) => block.text.includes("Monday · LinkedIn")),
    ).toBe(true);
    expect(
      blocks.some((block) => block.text.includes("#contentops #retainer")),
    ).toBe(true);
  });
});
