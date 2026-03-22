import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ResultsTabs } from "@/components/results/results-tabs";
import { requireSession } from "@/lib/auth/session";
import { getWorkspaceForUser } from "@/lib/data/workspaces";
import { getRunForWorkspace } from "@/lib/data/runs";
import { formatShortDate } from "@/lib/utils";

type PageProps = {
  params: Promise<{ workspaceId: string; runId: string }>;
};

export default async function ResultsPage({ params }: PageProps) {
  const session = await requireSession();
  const { workspaceId, runId } = await params;
  const workspace = await getWorkspaceForUser(workspaceId, session.user.id);

  if (!workspace) {
    notFound();
  }

  const run = await getRunForWorkspace(runId, workspace.id);

  if (!run) {
    notFound();
  }

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
              Generated {formatShortDate(run.createdAt)} with {run.model}. This Phase 1 view
              renders the normalized structured output and leaves clear extension points for
              carousels, scripts, export flows, and Google Docs delivery.
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
        <Panel className="p-7">
          <ResultsTabs output={run.structuredOutput} />
        </Panel>
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
