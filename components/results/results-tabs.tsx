"use client";

import { useId, useState } from "react";
import {
  type FormattedStructuredOutput,
  type ResultsSectionCopy,
  type ResultsSectionKey,
} from "@/lib/results/format";
import { cn } from "@/lib/utils";
import { CopyTextButton } from "@/components/results/copy-text-button";

const tabLabels: Array<[ResultsSectionKey, string]> = [
  ["overview", "Campaign summary"],
  ["calendar", "Calendar"],
  ["captions", "Captions"],
  ["hashtags", "Hashtags"],
  ["imagePrompts", "Image prompts"],
];

function SectionHeader({
  title,
  copyText,
}: {
  title: string;
  copyText: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-lg font-medium text-[var(--ink)]">{title}</p>
      <CopyTextButton label={`Copied ${title.toLowerCase()}.`} text={copyText} />
    </div>
  );
}

export function ResultsTabs({
  output,
  copySections,
}: {
  output: FormattedStructuredOutput;
  copySections: Record<ResultsSectionKey, ResultsSectionCopy>;
}) {
  const [active, setActive] = useState<ResultsSectionKey>("overview");
  const tabListId = useId();

  return (
    <div className="space-y-6">
      <div
        aria-label="Result sections"
        className="flex flex-wrap gap-2"
        role="tablist"
      >
        {tabLabels.map(([key, label]) => {
          const tabId = `${tabListId}-${key}-tab`;
          const panelId = `${tabListId}-${key}-panel`;

          return (
            <button
              aria-controls={panelId}
              aria-selected={active === key}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                active === key
                  ? "bg-[var(--ink)] text-[var(--surface-strong)]"
                  : "bg-white/60 text-[var(--ink-soft)] hover:text-[var(--ink)]",
              )}
              id={tabId}
              key={key}
              onClick={() => setActive(key)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        aria-labelledby={`${tabListId}-${active}-tab`}
        className="space-y-4"
        id={`${tabListId}-${active}-panel`}
        role="tabpanel"
      >
        {active === "overview" ? (
          <div className="rounded-[2rem] border border-[var(--line)] bg-white/80 p-6">
            <SectionHeader
              copyText={copySections.overview.copyText}
              title="Campaign summary"
            />
            <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-[var(--ink)]">
              {output.campaignSummary}
            </p>
          </div>
        ) : null}

        {active === "calendar" ? (
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-[var(--line)] bg-white/80 p-6">
              <SectionHeader copyText={copySections.calendar.copyText} title="Calendar" />
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                {output.calendarEntries.length} planned entries across the saved run.
              </p>
            </div>
            {output.calendarEntries.map((entry, index) => (
              <article
                className="rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-5"
                key={`${entry.day}-${index}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-medium text-[var(--ink)]">{entry.day}</p>
                  <span className="text-sm text-[var(--ink-soft)]">{entry.platform}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{entry.angle}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                  CTA · {entry.callToAction}
                </p>
              </article>
            ))}
          </div>
        ) : null}

        {active === "captions" ? (
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-[var(--line)] bg-white/80 p-6">
              <SectionHeader copyText={copySections.captions.copyText} title="Captions" />
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                Sample caption copy for reuse, editing, or export.
              </p>
            </div>
            {output.captions.map((caption, index) => (
              <article
                className="rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-5"
                key={`${caption.headline}-${index}`}
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                  {caption.platform}
                </p>
                <p className="mt-2 font-medium text-[var(--ink)]">{caption.headline}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--ink-soft)]">
                  {caption.body}
                </p>
              </article>
            ))}
          </div>
        ) : null}

        {active === "hashtags" ? (
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-[var(--line)] bg-white/80 p-6">
              <SectionHeader copyText={copySections.hashtags.copyText} title="Hashtags" />
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                Platform-specific hashtag groupings from the saved run.
              </p>
            </div>
            {output.hashtags.map((item) => (
              <article
                className="rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-5"
                key={item.platform}
              >
                <p className="font-medium text-[var(--ink)]">{item.platform}</p>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  {item.tags.join(" ")}
                </p>
              </article>
            ))}
          </div>
        ) : null}

        {active === "imagePrompts" ? (
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-[var(--line)] bg-white/80 p-6">
              <SectionHeader
                copyText={copySections.imagePrompts.copyText}
                title="Image prompts"
              />
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                Prompt-ready visual directions paired to the current run.
              </p>
            </div>
            {output.imagePrompts.map((item, index) => (
              <article
                className="rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-5"
                key={`${item.assetType}-${index}`}
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                  {item.assetType}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--ink)]">
                  {item.prompt}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
