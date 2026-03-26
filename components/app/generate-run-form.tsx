import type { ContentBrief, Preset } from "@prisma/client";
import { generateRunAction } from "@/app/(app)/app/actions";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";

export function GenerateRunForm({
  workspaceId,
  briefs,
  presets,
  selectedBriefId,
}: {
  workspaceId: string;
  briefs: ContentBrief[];
  presets: Preset[];
  selectedBriefId?: string;
}) {
  const defaultBrief = selectedBriefId ?? briefs[0]?.id ?? "";

  return (
    <form className="space-y-5" action={generateRunAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-[var(--ink-soft)]"
          htmlFor="briefId"
        >
          Source brief
        </label>
        <Select defaultValue={defaultBrief} id="briefId" name="briefId">
          {briefs.map((brief) => (
            <option key={brief.id} value={brief.id}>
              {brief.businessName} · {brief.cadence}
            </option>
          ))}
        </Select>
        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          Choose the saved brief you want this content plan to follow.
        </p>
      </div>
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-[var(--ink-soft)]"
          htmlFor="presetId"
        >
          Override preset
        </label>
        <Select defaultValue="" id="presetId" name="presetId">
          <option value="">Use the saved brief preset</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </Select>
        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          Leave this on the saved brief preset unless this run needs a different
          voice or structure.
        </p>
      </div>
      <SubmitButton pendingLabel="Generating plan...">
        Generate saved content plan
      </SubmitButton>
      <p className="text-xs leading-6 text-[var(--ink-soft)]">
        After generation, you will land on the results page to review the plan,
        refine sections, export it, or deliver it to Google Docs.
      </p>
    </form>
  );
}
