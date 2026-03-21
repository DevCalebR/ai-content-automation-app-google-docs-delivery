"use client";

import { useActionState } from "react";
import type { ContentBrief, Preset } from "@prisma/client";
import { saveBriefAction } from "@/app/(app)/app/actions";
import { FormStateMessage } from "@/components/ui/form-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

const initialState = {
  status: "idle" as const,
};

type BriefFormProps = {
  workspaceId: string;
  presets: Preset[];
  brief?: ContentBrief | null;
};

function fieldValue(list: string[] | undefined) {
  return list?.join(", ") ?? "";
}

export function BriefForm({ workspaceId, presets, brief }: BriefFormProps) {
  const [state, formAction] = useActionState(saveBriefAction, initialState);

  return (
    <form className="space-y-6" action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {brief ? <input type="hidden" name="briefId" value={brief.id} /> : null}

      <div className="field-grid">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="presetId">
            Preset
          </label>
          <Select defaultValue={brief?.presetId ?? ""} id="presetId" name="presetId">
            <option value="">No preset selected</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="businessName">
            Business name
          </label>
          <Input
            defaultValue={brief?.businessName}
            id="businessName"
            name="businessName"
            placeholder="North Star Media"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="niche">
            Niche
          </label>
          <Input
            defaultValue={brief?.niche}
            id="niche"
            name="niche"
            placeholder="B2B content operations"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="offer">
            Offer
          </label>
          <Input
            defaultValue={brief?.offer}
            id="offer"
            name="offer"
            placeholder="Done-for-you monthly content system"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="audience">
            Audience
          </label>
          <Textarea
            defaultValue={brief?.audience}
            id="audience"
            name="audience"
            placeholder="Who the business sells to and what they need right now."
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="brandVoice">
            Brand voice
          </label>
          <Textarea
            defaultValue={brief?.brandVoice}
            id="brandVoice"
            name="brandVoice"
            placeholder="Clear, practical, direct, and commercially grounded."
            required
          />
        </div>
      </div>

      <div className="field-grid">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="themes">
            Themes
          </label>
          <Textarea
            defaultValue={fieldValue(brief?.themes)}
            id="themes"
            name="themes"
            placeholder="operator insights, customer proof, workflow examples"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="platforms">
            Platforms
          </label>
          <Textarea
            defaultValue={fieldValue(brief?.platforms)}
            id="platforms"
            name="platforms"
            placeholder="LinkedIn, X, Email"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="cadence">
            Cadence
          </label>
          <Input
            defaultValue={brief?.cadence}
            id="cadence"
            name="cadence"
            placeholder="3 posts per week plus 1 email"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="goals">
            Goals
          </label>
          <Textarea
            defaultValue={fieldValue(brief?.goals)}
            id="goals"
            name="goals"
            placeholder="grow warm pipeline, book discovery calls"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="ctas">
            Calls to action
          </label>
          <Textarea
            defaultValue={fieldValue(brief?.ctas)}
            id="ctas"
            name="ctas"
            placeholder="Book a strategy call, reply for the template"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="promotions">
            Promotions
          </label>
          <Textarea
            defaultValue={fieldValue(brief?.promotions)}
            id="promotions"
            name="promotions"
            placeholder="April onboarding sprint, Q2 planning offer"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="notes">
          Notes
        </label>
        <Textarea
          defaultValue={brief?.notes ?? ""}
          id="notes"
          name="notes"
          placeholder="Constraints, approvals, compliance notes, or campaign context."
        />
      </div>

      <FormStateMessage state={state} />
      <SubmitButton pendingLabel="Saving brief...">
        {brief ? "Update brief" : "Save brief"}
      </SubmitButton>
    </form>
  );
}
