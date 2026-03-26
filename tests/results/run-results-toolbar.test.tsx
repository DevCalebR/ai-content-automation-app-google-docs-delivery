import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { RunResultsToolbar } from "@/components/results/run-results-toolbar";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useActionState: () => [{ status: "idle" }, vi.fn()],
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/app/(app)/app/actions", () => ({
  deliverRunToGoogleDocsAction: vi.fn(),
}));

describe("RunResultsToolbar", () => {
  it("shows the primary results actions and refinement guidance for a ready run", () => {
    const markup = renderToStaticMarkup(
      <RunResultsToolbar
        copyAllText="Full run copy"
        docxDownloadUrl="/docx"
        googleDocsConnected={true}
        googleDocsServerReady={true}
        isOwner={true}
        latestDelivery={null}
        markdownDownloadUrl="/markdown"
        pdfDownloadUrl="/pdf"
        runId="run-1"
        settingsHref="/settings"
        textDownloadUrl="/text"
        workspaceId="workspace-1"
      />,
    );

    expect(markup).toContain("Download DOCX");
    expect(markup).toContain("Download PDF");
    expect(markup).toContain("Copy full run");
    expect(markup).toContain("Advanced exports");
    expect(markup).toContain("Deliver to Google Docs");
    expect(markup).toContain(
      "Use Refine with AI inside the section tabs below.",
    );
  });

  it("shows delivery setup guidance instead of the delivery action when the workspace is not connected", () => {
    const markup = renderToStaticMarkup(
      <RunResultsToolbar
        copyAllText="Full run copy"
        docxDownloadUrl="/docx"
        googleDocsConnected={false}
        googleDocsServerReady={true}
        isOwner={true}
        latestDelivery={null}
        markdownDownloadUrl="/markdown"
        pdfDownloadUrl="/pdf"
        runId="run-1"
        settingsHref="/settings"
        textDownloadUrl="/text"
        workspaceId="workspace-1"
      />,
    );

    expect(markup).toContain("Open delivery setup");
    expect(markup).toContain(
      "Open delivery setup and save a folder before this workspace can send runs to Google Docs.",
    );
    expect(markup).not.toContain("Deliver to Google Docs</span>");
  });
});
