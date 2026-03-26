import { Panel } from "@/components/ui/panel";
import { WorkspaceCreateForm } from "@/components/app/workspace-create-form";

export default function OnboardingPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
      <Panel className="p-7">
        <p className="section-heading">Onboarding</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-[var(--ink)]">
          Create the first workspace before briefs and runs start compounding.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
          Each workspace keeps presets, briefs, generation history, and settings
          organized around one brand, client, or business line.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              1
            </p>
            <p className="mt-3 font-medium text-[var(--ink)]">
              Create the workspace
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
              Name the brand or client context you want all briefs and runs to
              live inside.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              2
            </p>
            <p className="mt-3 font-medium text-[var(--ink)]">
              Save the first brief
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
              Capture the offer, audience, themes, cadence, and calls to action
              you want the app to reuse.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              3
            </p>
            <p className="mt-3 font-medium text-[var(--ink)]">
              Generate and export
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
              Review the saved results, refine sections, then download DOCX or
              PDF or deliver to Google Docs.
            </p>
          </div>
        </div>
      </Panel>
      <Panel className="p-7">
        <p className="text-2xl font-medium text-[var(--ink)]">
          Create workspace
        </p>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
          Use one workspace per brand, client, or business line you want to
          manage independently. You can rename it later once the first customer
          flow is live.
        </p>
        <div className="mt-8">
          <WorkspaceCreateForm />
        </div>
      </Panel>
    </div>
  );
}
