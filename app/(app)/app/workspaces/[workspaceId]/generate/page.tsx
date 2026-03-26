import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { GenerateRunForm } from "@/components/app/generate-run-form";
import { requireSession } from "@/lib/auth/session";
import { getWorkspaceForUser } from "@/lib/data/workspaces";
import { getBriefsForWorkspace } from "@/lib/data/briefs";
import { getPresetOptions } from "@/lib/data/presets";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ briefId?: string; error?: string }>;
};

export default async function GeneratePage({
  params,
  searchParams,
}: PageProps) {
  const session = await requireSession();
  const { workspaceId } = await params;
  const { briefId, error } = await searchParams;
  const workspace = await getWorkspaceForUser(workspaceId, session.user.id);

  if (!workspace) {
    notFound();
  }

  const [briefs, presets] = await Promise.all([
    getBriefsForWorkspace(workspace.id),
    getPresetOptions(workspace.id),
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
      <Panel className="p-7">
        <p className="section-heading">Generation</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-[var(--ink)]">
          Launch a structured content plan from a saved brief.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
          Run a server-side OpenAI workflow that turns a saved brief into a
          structured content plan you can review, refine, export, and deliver.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5">
            <p className="font-medium text-[var(--ink)]">Stored result shape</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Campaign summary, calendar entries, sample captions, hashtag sets,
              and image prompts are normalized into a structured output record.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5">
            <p className="font-medium text-[var(--ink)]">What happens next</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              The completed run opens on the results page, where you can refine
              individual sections, copy the saved plan, download DOCX or PDF, or
              deliver to Google Docs.
            </p>
          </div>
        </div>
      </Panel>
      <Panel className="p-7">
        <p className="text-2xl font-medium text-[var(--ink)]">Generate now</p>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
          Choose a saved brief, optionally override the preset, and generate the
          first saved content plan for this workspace.
        </p>
        {error ? (
          <p className="mt-4 text-sm text-[var(--danger)]">
            {error === "rate-limited"
              ? "Generation is temporarily rate limited. Try again shortly."
              : "We couldn’t start generation. Check that the selected brief still exists."}
          </p>
        ) : null}
        <div className="mt-8">
          {briefs.length ? (
            <GenerateRunForm
              briefs={briefs}
              presets={presets}
              selectedBriefId={briefId}
              workspaceId={workspace.id}
            />
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] bg-white/60 p-6 text-sm text-[var(--ink-soft)]">
              <p>Save a brief first, then return here to generate content.</p>
              <p className="mt-3">
                The fastest path is: create the brief in the workspace, generate
                the run here, then use the results page for exports or Google
                Docs delivery.
              </p>
              <div className="mt-4">
                <Link href={`/app/workspaces/${workspace.id}`}>
                  <span className="font-medium text-[var(--ink)]">
                    Create first brief
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
