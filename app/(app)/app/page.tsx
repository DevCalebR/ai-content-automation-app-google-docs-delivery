import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/session";
import { getUserWorkspaces } from "@/lib/data/workspaces";
import { db } from "@/lib/db";
import { formatShortDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await requireSession();
  const workspaces = await getUserWorkspaces(session.user.id);

  if (!workspaces.length) {
    redirect("/app/onboarding");
  }

  const recentRuns = await db.generationRun.findMany({
    where: {
      initiatedById: session.user.id,
    },
    include: {
      workspace: true,
      brief: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Panel className="p-7">
          <p className="section-heading">Dashboard</p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-[var(--ink)]">
            Manage briefs, launch runs, and deliver finished content plans.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
            Keep each workspace organized with reusable presets, structured
            briefs, saved runs, and a consistent generation workflow that ends
            in exports or Google Docs delivery.
          </p>
        </Panel>
        <Panel className="p-7">
          <p className="section-heading">At a glance</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-3xl font-medium text-[var(--ink)]">
                {workspaces.length}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Active workspaces
              </p>
            </div>
            <div>
              <p className="text-3xl font-medium text-[var(--ink)]">
                {workspaces.reduce((sum, item) => sum + item._count.briefs, 0)}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Saved briefs
              </p>
            </div>
            <div>
              <p className="text-3xl font-medium text-[var(--ink)]">
                {workspaces.reduce(
                  (sum, item) => sum + item._count.generationRuns,
                  0,
                )}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Generation runs
              </p>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel className="p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-heading">Workspaces</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                Open a workspace to edit briefs, generate content, or review
                settings.
              </p>
            </div>
            <Link
              className="text-sm font-medium text-[var(--ink)]"
              href="/app/onboarding"
            >
              Create another
            </Link>
          </div>
          <div className="mt-6 space-y-3">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={`/app/workspaces/${workspace.id}`}
                className="block rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5 transition hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-medium text-[var(--ink)]">
                      {workspace.name}
                    </p>
                    <p className="mt-2 text-sm text-[var(--ink-soft)]">
                      {workspace.description || "No description added yet."}
                    </p>
                  </div>
                  <Badge>
                    {workspace._count.briefs} briefs ·{" "}
                    {workspace._count.generationRuns} runs
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="p-7">
          <p className="section-heading">Recent runs</p>
          <div className="mt-6 space-y-3">
            {recentRuns.length ? (
              recentRuns.map((run) => (
                <Link
                  key={run.id}
                  href={`/app/workspaces/${run.workspaceId}/results/${run.id}`}
                  className="block rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5 transition hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--ink)]">
                        {run.brief.businessName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {run.workspace.name}
                      </p>
                    </div>
                    <Badge>{run.status}</Badge>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                    {formatShortDate(run.createdAt)}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] bg-white/60 p-6 text-sm text-[var(--ink-soft)]">
                <p>
                  No runs yet. Start inside a workspace by saving a brief, then
                  generate the first plan.
                </p>
                <div className="mt-4">
                  <Link
                    className="font-medium text-[var(--ink)]"
                    href={`/app/workspaces/${workspaces[0]?.id}`}
                  >
                    Open the first workspace
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}
