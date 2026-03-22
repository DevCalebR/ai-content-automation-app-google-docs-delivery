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
          A workspace owns presets, content briefs, generation history, and future
          integration state. The model stays durable and simple: one explicit owner, clear
          membership records, and extension points for collaboration later.
        </p>
      </Panel>
      <Panel className="p-7">
        <p className="text-2xl font-medium text-[var(--ink)]">Create workspace</p>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
          Use one workspace per brand, client, or business line you want to manage
          independently.
        </p>
        <div className="mt-8">
          <WorkspaceCreateForm />
        </div>
      </Panel>
    </div>
  );
}
