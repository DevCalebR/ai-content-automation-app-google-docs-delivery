import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ResultsTabs } from "@/components/results/results-tabs";
import { RunResultsToolbar } from "@/components/results/run-results-toolbar";
import { requireSession } from "@/lib/auth/session";
import { getRunForWorkspace } from "@/lib/data/runs";
import { db } from "@/lib/db";
import { hasGoogleDocsServiceAccountConfig } from "@/lib/google-docs/client";
import { getGoogleDocsConnectionMetadata } from "@/lib/google-docs/connection";
import { buildRunExportContent } from "@/lib/results/format";
import { formatShortDate } from "@/lib/utils";
import { getWorkspaceAuthorizationForUser } from "@/lib/workspaces/service";

type PageProps = {
  params: Promise<{ workspaceId: string; runId: string }>;
};

export default async function ResultsPage({ params }: PageProps) {
  const session = await requireSession();
  const { workspaceId, runId } = await params;
  const authorization = await getWorkspaceAuthorizationForUser(workspaceId, session.user.id);

  if (!authorization) {
    notFound();
  }
  const workspace = authorization.workspace;

  const run = await getRunForWorkspace(runId, workspace.id);

  if (!run) {
    notFound();
  }

  const googleDocsConnection = await db.integrationConnection.findFirst({
    where: {
      workspaceId: workspace.id,
      provider: "GOOGLE_DOCS",
    },
  });
  const googleDocsMetadata = getGoogleDocsConnectionMetadata(googleDocsConnection);
  const googleDocsDelivery = run.deliveries.find((delivery) => delivery.provider === "GOOGLE_DOCS");
  const exportContent = run.structuredOutput
    ? buildRunExportContent({
        businessName: run.brief.businessName,
        createdAt: run.createdAt,
        model: run.model,
        output: run.structuredOutput,
      })
    : null;
  const downloadBasePath = `/app/workspaces/${workspace.id}/results/${run.id}/download`;

  return (
    <div className="space-y-6">
      <Panel className="p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-heading">Results workspace</p>
            <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-[var(--ink)]">
              {run.brief.businessName}
            </h1>
            <p className="mt-3 text-base leading-8 text-[var(--ink-soft)]">
              Generated {formatShortDate(run.createdAt)} with {run.model}. Review the
              campaign summary, calendar, captions, hashtags, and image prompts for this
              run in one place.
            </p>
          </div>
          <Badge>{run.status}</Badge>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/app/workspaces/${workspace.id}/history`}>
            <Button variant="secondary">Back to history</Button>
          </Link>
          <Link href={`/app/workspaces/${workspace.id}/generate?briefId=${run.briefId}`}>
            <Button>Generate again</Button>
          </Link>
        </div>
      </Panel>

      {run.status === "FAILED" ? (
        <Panel className="p-7">
          <p className="text-lg font-medium text-[var(--danger)]">Generation failed</p>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
            {run.errorMessage ||
              "The generation attempt did not complete. Review the brief, environment variables, and OpenAI connectivity before retrying."}
          </p>
        </Panel>
      ) : null}

      {run.structuredOutput ? (
        <>
          <RunResultsToolbar
            copyAllText={exportContent!.plainText}
            googleDocsConnected={Boolean(googleDocsMetadata)}
            googleDocsServerReady={hasGoogleDocsServiceAccountConfig()}
            isOwner={authorization.isOwner}
            latestDelivery={googleDocsDelivery}
            markdownDownloadUrl={`${downloadBasePath}?format=markdown`}
            runId={run.id}
            settingsHref={`/app/workspaces/${workspace.id}/settings`}
            textDownloadUrl={`${downloadBasePath}?format=text`}
            workspaceId={workspace.id}
          />
          <Panel className="p-7">
            <ResultsTabs copySections={exportContent!.copySections} output={exportContent!.formattedOutput} />
          </Panel>
        </>
      ) : run.status !== "FAILED" ? (
        <Panel className="p-7">
          <p className="text-sm text-[var(--ink-soft)]">
            This run has not written a structured output yet.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}
