import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/lib/auth/session";
import { getWorkspaceForUser } from "@/lib/data/workspaces";
import { getRunsForWorkspace } from "@/lib/data/runs";
import { formatShortDate } from "@/lib/utils";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function HistoryPage({ params }: PageProps) {
  const session = await requireSession();
  const { workspaceId } = await params;
  const workspace = await getWorkspaceForUser(workspaceId, session.user.id);

  if (!workspace) {
    notFound();
  }

  const runs = await getRunsForWorkspace(workspace.id);
  const runsByBrief = runs.reduce<Record<string, number>>((counts, run) => {
    counts[run.briefId] = (counts[run.briefId] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <div className="space-y-6">
      <Panel className="p-7">
        <p className="section-heading">Run history</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-[var(--ink)]">
          Every generation attempt stays attached to {workspace.name}.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
          Use history to reopen finished content plans, confirm which brief and preset
          produced each run, and return to exports or delivery whenever you need them.
        </p>
      </Panel>
      <Panel className="p-7">
        <div className="space-y-3">
          {runs.length ? (
            runs.map((run) => {
              const googleDocsDelivery = run.deliveries.find(
                (delivery) => delivery.provider === "GOOGLE_DOCS",
              );

              return (
                <div
                  key={run.id}
                  className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-[var(--ink)]">
                        {run.brief.businessName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {run.preset?.name ?? "Brief preset"} · {run.model}
                      </p>
                      <p className="mt-3 text-sm text-[var(--ink-soft)]">
                        Created {formatShortDate(run.createdAt)}
                        {run.completedAt
                          ? ` · Completed ${formatShortDate(run.completedAt)}`
                          : ""}
                      </p>
                      <p className="mt-2 text-sm text-[var(--ink-soft)]">
                        {runsByBrief[run.briefId]} run
                        {runsByBrief[run.briefId] === 1 ? "" : "s"} from this
                        brief.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{run.status}</Badge>
                      {run.structuredOutput ? (
                        <Badge>EXPORT_READY</Badge>
                      ) : null}
                      {googleDocsDelivery ? (
                        <Badge>{googleDocsDelivery.status}</Badge>
                      ) : null}
                    </div>
                  </div>
                  {run.structuredOutput?.campaignSummary ? (
                    <p className="mt-4 line-clamp-2 text-sm leading-7 text-[var(--ink-soft)]">
                      {run.structuredOutput.campaignSummary}
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/app/workspaces/${workspace.id}/results/${run.id}`}
                    >
                      <span className="text-sm font-medium text-[var(--ink)]">
                        Open plan
                      </span>
                    </Link>
                    <Link
                      href={`/app/workspaces/${workspace.id}/generate?briefId=${run.briefId}`}
                    >
                      <span className="text-sm font-medium text-[var(--ink)]">
                        Generate again
                      </span>
                    </Link>
                    {googleDocsDelivery?.externalUrl ? (
                      <a
                        className="text-sm font-medium text-[var(--ink)]"
                        href={googleDocsDelivery.externalUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open delivered doc
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] bg-white/60 p-6 text-sm text-[var(--ink-soft)]">
              <p>No runs have been recorded for this workspace yet.</p>
              <p className="mt-3">
                Generate the first plan for this workspace, then return here any
                time you need to reopen results, compare runs, or deliver a
                saved document.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`/app/workspaces/${workspace.id}/generate`}>
                  <span className="font-medium text-[var(--ink)]">
                    Generate first plan
                  </span>
                </Link>
                <Link href={`/app/workspaces/${workspace.id}`}>
                  <span className="font-medium text-[var(--ink)]">
                    Back to workspace
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
