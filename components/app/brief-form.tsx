"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ContentBrief, Preset } from "@prisma/client";
import { saveBriefAction } from "@/app/(app)/app/actions";
import { FieldErrorMessage, FormStateMessage } from "@/components/ui/form-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  buildBriefFormValuesFromBrief,
  createInitialBriefState,
  getFirstBriefErrorField,
  type BriefFormFieldName,
} from "@/lib/validations/brief";

const invalidFieldClassName = "border-[var(--danger)] focus:border-[var(--danger)]";

type BriefFormProps = {
  workspaceId: string;
  presets: Preset[];
  brief?: ContentBrief | null;
};

export function BriefForm({ workspaceId, presets, brief }: BriefFormProps) {
  const initialValues = buildBriefFormValuesFromBrief(workspaceId, brief);
  const [state, formAction] = useActionState(
    saveBriefAction,
    createInitialBriefState(initialValues),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const firstErrorField = getFirstBriefErrorField(state.fieldErrors);
  const formKey = `brief-form-${workspaceId}-${state.submissionId}-${brief?.id ?? "new"}`;

  useEffect(() => {
    if (state.status !== "error" || !firstErrorField) {
      return;
    }

    const field = formRef.current?.elements.namedItem(firstErrorField);

    if (field instanceof HTMLElement) {
      field.focus();
    }
  }, [firstErrorField, state.status, state.submissionId]);

  function getFieldError(fieldName: BriefFormFieldName) {
    return state.fieldErrors[fieldName];
  }

  function getFieldProps(fieldName: BriefFormFieldName) {
    const errorMessage = getFieldError(fieldName);

    return {
      "aria-describedby": errorMessage ? `${fieldName}-error` : undefined,
      "aria-invalid": Boolean(errorMessage),
      className: errorMessage ? invalidFieldClassName : undefined,
    };
  }

  function renderFieldError(fieldName: BriefFormFieldName) {
    return (
      <FieldErrorMessage
        id={`${fieldName}-error`}
        message={getFieldError(fieldName)}
      />
    );
  }

  return (
    <form
      key={formKey}
      action={formAction}
      className="space-y-6"
      ref={formRef}
    >
      <input type="hidden" name="workspaceId" value={state.values.workspaceId} />
      <input type="hidden" name="briefId" value={state.values.briefId} />

      <div className="field-grid">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="presetId">
            Preset
          </label>
          <Select
            defaultValue={state.values.presetId}
            id="presetId"
            name="presetId"
            {...getFieldProps("presetId")}
          >
            <option value="">No preset selected</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </Select>
          {renderFieldError("presetId")}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="businessName">
            Business name
          </label>
          <Input
            defaultValue={state.values.businessName}
            id="businessName"
            name="businessName"
            placeholder="North Star Media"
            required
            {...getFieldProps("businessName")}
          />
          {renderFieldError("businessName")}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="niche">
            Niche
          </label>
          <Input
            defaultValue={state.values.niche}
            id="niche"
            name="niche"
            placeholder="B2B content operations"
            required
            {...getFieldProps("niche")}
          />
          {renderFieldError("niche")}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="offer">
            Offer
          </label>
          <Input
            defaultValue={state.values.offer}
            id="offer"
            name="offer"
            placeholder="Done-for-you monthly content system"
            required
            {...getFieldProps("offer")}
          />
          {renderFieldError("offer")}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="audience">
            Audience
          </label>
          <Textarea
            defaultValue={state.values.audience}
            id="audience"
            name="audience"
            placeholder="Who the business sells to and what they need right now."
            required
            {...getFieldProps("audience")}
          />
          {renderFieldError("audience")}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="brandVoice">
            Brand voice
          </label>
          <Textarea
            defaultValue={state.values.brandVoice}
            id="brandVoice"
            name="brandVoice"
            placeholder="Clear, practical, direct, and commercially grounded."
            required
            {...getFieldProps("brandVoice")}
          />
          {renderFieldError("brandVoice")}
        </div>
      </div>

      <div className="field-grid">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="themes">
            Themes
          </label>
          <Textarea
            defaultValue={state.values.themes}
            id="themes"
            name="themes"
            placeholder="operator insights, customer proof, workflow examples"
            required
            {...getFieldProps("themes")}
          />
          {renderFieldError("themes")}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="platforms">
            Platforms
          </label>
          <Textarea
            defaultValue={state.values.platforms}
            id="platforms"
            name="platforms"
            placeholder="LinkedIn, X, Email"
            required
            {...getFieldProps("platforms")}
          />
          {renderFieldError("platforms")}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="cadence">
            Cadence
          </label>
          <Input
            defaultValue={state.values.cadence}
            id="cadence"
            name="cadence"
            placeholder="3 posts per week plus 1 email"
            required
            {...getFieldProps("cadence")}
          />
          {renderFieldError("cadence")}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="goals">
            Goals
          </label>
          <Textarea
            defaultValue={state.values.goals}
            id="goals"
            name="goals"
            placeholder="grow warm pipeline, book discovery calls"
            required
            {...getFieldProps("goals")}
          />
          {renderFieldError("goals")}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="ctas">
            Calls to action
          </label>
          <Textarea
            defaultValue={state.values.ctas}
            id="ctas"
            name="ctas"
            placeholder="Book a strategy call, reply for the template"
            required
            {...getFieldProps("ctas")}
          />
          {renderFieldError("ctas")}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="promotions">
            Promotions
          </label>
          <Textarea
            defaultValue={state.values.promotions}
            id="promotions"
            name="promotions"
            placeholder="April onboarding sprint, Q2 planning offer"
            {...getFieldProps("promotions")}
          />
          {renderFieldError("promotions")}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="notes">
          Notes
        </label>
        <Textarea
          defaultValue={state.values.notes}
          id="notes"
          name="notes"
          placeholder="Constraints, approvals, compliance notes, or campaign context."
          {...getFieldProps("notes")}
        />
        {renderFieldError("notes")}
      </div>

      <FormStateMessage state={state} />
      <SubmitButton pendingLabel="Saving brief...">
        {state.values.briefId ? "Update brief" : "Save brief"}
      </SubmitButton>
    </form>
  );
}
