import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { BriefForm } from "@/components/app/brief-form";
import { duplicateBriefAction } from "@/app/(app)/app/actions";
import { requireSession } from "@/lib/auth/session";
import { getWorkspaceForUser } from "@/lib/data/workspaces";
import { getBriefForWorkspace, getBriefsForWorkspace } from "@/lib/data/briefs";
import { getPresetOptions } from "@/lib/data/presets";
import { formatShortDate } from "@/lib/utils";
import { getWorkspaceAuthorizationForUser } from "@/lib/workspaces/service";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ briefId?: string }>;
};

export default async function WorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const session = await requireSession();
  const { workspaceId } = await params;
  const { briefId } = await searchParams;
  const [workspace, authorization] = await Promise.all([
    getWorkspaceForUser(workspaceId, session.user.id),
    getWorkspaceAuthorizationForUser(workspaceId, session.user.id),
  ]);

  if (!workspace || !authorization) {
    notFound();
  }

  const [briefs, presets, activeBrief] = await Promise.all([
    getBriefsForWorkspace(workspace.id),
    getPresetOptions(workspace.id),
    briefId
      ? getBriefForWorkspace(briefId, workspace.id)
      : Promise.resolve(null),
  ]);
  const hasBriefs = briefs.length > 0;
  const hasRuns = workspace._count.generationRuns > 0;
  const primaryAction = !hasBriefs
    ? {
        href: `/app/workspaces/${workspace.id}#brief-intake`,
        label: "Save first brief",
      }
    : !hasRuns
      ? {
          href: `/app/workspaces/${workspace.id}/generate?briefId=${briefs[0]?.id ?? ""}`,
          label: "Generate first plan",
        }
      : {
          href: `/app/workspaces/${workspace.id}/generate`,
          label: "Generate content plan",
        };
  const nextStep = !hasBriefs
    ? {
        title: "Next step: create the first reusable brief",
        body: "Start with the structured brief below. Once it is saved, the generate page becomes the fastest path to the first finished content plan.",
      }
    : !hasRuns
      ? {
          title: "Next step: launch the first saved run",
          body: "This workspace already has a brief. Generate the first plan next, then open the results page to refine sections, copy the full run, or export it.",
        }
      : {
          title: "Next step: keep generating and delivering",
          body: "Open any saved brief to iterate, or generate a fresh run and use the results page for exports, Google Docs delivery, and section-level refinements.",
        };

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Panel className="p-7">
          <p className="section-heading">Workspace</p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-[var(--ink)]">
            {workspace.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
            {workspace.description ||
              "Use this workspace to keep every brief, preset decision, and generation run attached to the same operating context."}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge>{workspace._count.briefs} briefs</Badge>
            <Badge>{workspace._count.generationRuns} runs</Badge>
            <Badge>
              {authorization.isOwner ? "Owner access" : "Member access"}
            </Badge>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={primaryAction.href}>
              <Button>{primaryAction.label}</Button>
            </Link>
            <Link href={`/app/workspaces/${workspace.id}/history`}>
              <Button variant="secondary">View history</Button>
            </Link>
            <Link href={`/app/workspaces/${workspace.id}/settings`}>
              <Button variant="secondary">
                {authorization.isOwner ? "Manage settings" : "View settings"}
              </Button>
            </Link>
          </div>
          <div className="mt-4 rounded-[1.5rem] border border-[var(--line)] bg-white/60 p-4 text-sm text-[var(--ink-soft)]">
            <p className="font-medium text-[var(--ink)]">
              {authorization.isOwner
                ? "Google Docs delivery and workspace configuration live in settings."
                : "Settings show the shared Google Docs delivery setup for this workspace."}
            </p>
            <p className="mt-2 leading-7">
              {authorization.isOwner
                ? "Use settings to connect the shared Google Drive folder, update workspace details, and control delivery for completed runs."
                : "Only workspace owners can change settings, but you can still review the current delivery setup, create briefs, and run generations."}
            </p>
          </div>
          <div className="mt-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--ink-soft)]">
            <p className="font-medium text-[var(--ink)]">{nextStep.title}</p>
            <p className="mt-2 leading-7">{nextStep.body}</p>
          </div>
        </Panel>
        <Panel className="p-7">
          <p className="section-heading">System presets</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Badge key={preset.id}>{preset.name}</Badge>
            ))}
          </div>
          <p className="mt-6 text-sm leading-7 text-[var(--ink-soft)]">
            Choose from reusable presets for Real Estate, Coach/Consultant,
            SaaS/Productized Service, E-commerce, Local Business, and Creator
            Brand.
          </p>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <Panel className="p-7" id="brief-intake">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-heading">Structured brief intake</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                {activeBrief
                  ? "Editing the selected brief."
                  : "Create a new reusable brief. This is the first step before generation."}
              </p>
            </div>
            {activeBrief ? (
              <Link
                className="text-sm font-medium text-[var(--ink)]"
                href={`/app/workspaces/${workspace.id}`}
              >
                New brief
              </Link>
            ) : null}
          </div>
          <div className="mt-6">
            <BriefForm
              brief={activeBrief}
              presets={presets}
              workspaceId={workspace.id}
            />
          </div>
        </Panel>

        <Panel className="p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-heading">Saved briefs</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                Reopen or duplicate a saved brief before generating a new run.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {briefs.length ? (
              briefs.map((brief) => (
                <div
                  key={brief.id}
                  className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--ink)]">
                        {brief.businessName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {brief.cadence}
                      </p>
                    </div>
                    <Badge>{brief._count.generationRuns} runs</Badge>
                  </div>
                  <p className="mt-3 text-sm text-[var(--ink-soft)]">
                    Updated {formatShortDate(brief.updatedAt)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/app/workspaces/${workspace.id}?briefId=${brief.id}`}
                    >
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    </Link>
                    <form action={duplicateBriefAction}>
                      <input type="hidden" name="briefId" value={brief.id} />
                      <Button size="sm" variant="ghost" type="submit">
                        Duplicate
                      </Button>
                    </form>
                    <Link
                      href={`/app/workspaces/${workspace.id}/generate?briefId=${brief.id}`}
                    >
                      <Button size="sm">Generate</Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] bg-white/60 p-6 text-sm text-[var(--ink-soft)]">
                <p>
                  No briefs saved yet. Fill out the form to create your first
                  reusable brief.
                </p>
                <p className="mt-3">
                  After the first brief is saved, return to the generate page to
                  launch the first content plan for this workspace.
                </p>
                <div className="mt-4">
                  <a
                    className="font-medium text-[var(--ink)]"
                    href="#brief-intake"
                  >
                    Jump to brief intake
                  </a>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}
