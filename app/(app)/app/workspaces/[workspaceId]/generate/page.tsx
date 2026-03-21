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

export default async function GeneratePage({ params, searchParams }: PageProps) {
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
          Phase 1 runs a real server-side OpenAI flow using the Responses API, schema-backed
          parsing, and durable storage for the normalized result.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5">
            <p className="font-medium text-[var(--ink)]">Stored result shape</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Campaign summary, calendar entries, sample captions, hashtag sets, and image
              prompts are normalized into a structured output record.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5">
            <p className="font-medium text-[var(--ink)]">Extension path</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Carousels, scripts, background jobs, exports, and Google Docs delivery can
              layer onto the same generation run and output model in Phase 2.
            </p>
          </div>
        </div>
      </Panel>
      <Panel className="p-7">
        <p className="text-2xl font-medium text-[var(--ink)]">Generate now</p>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
          Choose a saved brief, optionally override the preset, and generate the first
          structured plan.
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
              Save a brief first, then return here to generate content.
              <div className="mt-4">
                <Link className="font-medium text-[var(--ink)]" href={`/app/workspaces/${workspace.id}`}>
                  Open workspace brief intake
                </Link>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
