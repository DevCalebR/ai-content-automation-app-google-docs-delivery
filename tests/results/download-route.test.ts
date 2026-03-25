import JSZip from "jszip";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.fn();
const getWorkspaceAccessForUserMock = vi.fn();
const generationRunFindFirstMock = vi.fn();
const usageEventCreateMock = vi.fn();
const logAuditEventMock = vi.fn();

function extractPdfText(buffer: Buffer) {
  return Array.from(buffer.toString("latin1").matchAll(/<([0-9A-Fa-f]+)>/g))
    .map((match) => Buffer.from(match[1], "hex").toString("latin1"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value: string) {
  return value.replace(/\s+/g, "");
}

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/workspaces/service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/workspaces/service")>(
    "@/lib/workspaces/service",
  );

  return {
    ...actual,
    getWorkspaceAccessForUser: getWorkspaceAccessForUserMock,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    generationRun: {
      findFirst: generationRunFindFirstMock,
    },
    usageEvent: {
      create: usageEventCreateMock,
    },
  },
}));

vi.mock("@/lib/logger", async () => {
  const actual = await vi.importActual<typeof import("@/lib/logger")>("@/lib/logger");

  return {
    ...actual,
    logAuditEvent: logAuditEventMock,
  };
});

describe("results download route", () => {
  beforeEach(() => {
    vi.resetModules();
    getServerSessionMock.mockReset();
    getWorkspaceAccessForUserMock.mockReset();
    generationRunFindFirstMock.mockReset();
    usageEventCreateMock.mockReset();
    logAuditEventMock.mockReset();

    getServerSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });

    getWorkspaceAccessForUserMock.mockResolvedValue({
      id: "workspace-1",
      name: "Client Delivery",
    });

    generationRunFindFirstMock.mockResolvedValue({
      id: "run-1",
      workspaceId: "workspace-1",
      model: "gpt-5.4-mini",
      createdAt: new Date("2026-03-25T12:00:00.000Z"),
      brief: {
        businessName: "North Star Media",
      },
      structuredOutput: {
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
    });
  });

  it("blocks unauthenticated export requests", async () => {
    getServerSessionMock.mockResolvedValue(null);

    const { GET } = await import(
      "@/app/(app)/app/workspaces/[workspaceId]/results/[runId]/download/route"
    );
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/app/workspaces/workspace-1/results/run-1/download?format=pdf",
      ),
      {
        params: Promise.resolve({
          workspaceId: "workspace-1",
          runId: "run-1",
        }),
      },
    );

    expect(response.status).toBe(401);
    expect(getWorkspaceAccessForUserMock).not.toHaveBeenCalled();
  });

  it("returns a real DOCX export built from the saved refined run result", async () => {
    const { GET } = await import(
      "@/app/(app)/app/workspaces/[workspaceId]/results/[runId]/download/route"
    );
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/app/workspaces/workspace-1/results/run-1/download?format=docx",
      ),
      {
        params: Promise.resolve({
          workspaceId: "workspace-1",
          runId: "run-1",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(response.headers.get("content-disposition")).toContain(".docx");

    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.subarray(0, 2).toString("utf8")).toBe("PK");

    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    expect(documentXml).toContain("Client Delivery");
    expect(documentXml).toContain("Refined summary for the accepted section revision.");
    expect(documentXml).toContain("Client win spotlight");
    expect(documentXml).toContain("Refined caption body from the saved result.");
    expect(documentXml).toContain("#contentops #retainer #agencygrowth");
    expect(documentXml).toContain("Refined image prompt from the saved result.");
  });

  it("returns a real PDF export built from the saved refined run result", async () => {
    const { GET } = await import(
      "@/app/(app)/app/workspaces/[workspaceId]/results/[runId]/download/route"
    );
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/app/workspaces/workspace-1/results/run-1/download?format=pdf",
      ),
      {
        params: Promise.resolve({
          workspaceId: "workspace-1",
          runId: "run-1",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(".pdf");

    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");

    const pdfText = extractPdfText(buffer);
    const compactPdfText = compactText(pdfText);
    expect(compactPdfText).toContain("Workspace:ClientDelivery");
    expect(compactPdfText).toContain("Refinedsummaryfortheacceptedsectionrevision.");
    expect(compactPdfText).toContain("Clientwinspotlight");
    expect(compactPdfText).toContain("Refinedcaptionbodyfromthesavedresult.");
    expect(compactPdfText).toContain("#contentops#retainer#agencygrowth");
    expect(compactPdfText).toContain("Refinedimagepromptfromthesavedresult.");
  });

  it("keeps markdown export available as a secondary format", async () => {
    const { GET } = await import(
      "@/app/(app)/app/workspaces/[workspaceId]/results/[runId]/download/route"
    );
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/app/workspaces/workspace-1/results/run-1/download?format=markdown",
      ),
      {
        params: Promise.resolve({
          workspaceId: "workspace-1",
          runId: "run-1",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(await response.text()).toContain("Refined summary for the accepted section revision.");
  });
});
