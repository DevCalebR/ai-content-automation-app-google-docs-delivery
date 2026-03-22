"use client";

import { useState } from "react";
import type { StructuredOutput } from "@prisma/client";
import { cn } from "@/lib/utils";

const tabLabels = [
  ["overview", "Overview"],
  ["calendar", "Calendar"],
  ["captions", "Captions"],
  ["hashtags", "Hashtags"],
  ["imagePrompts", "Image prompts"],
] as const;

type TabKey = (typeof tabLabels)[number][0];

export function ResultsTabs({ output }: { output: StructuredOutput }) {
  const [active, setActive] = useState<TabKey>("overview");
  const calendarEntries = output.calendarEntries as Array<Record<string, string>>;
  const captions = output.captions as Array<Record<string, string>>;
  const hashtags = output.hashtags as Array<{ platform: string; tags: string[] }>;
  const imagePrompts = output.imagePrompts as Array<Record<string, string>>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabLabels.map(([key, label]) => (
          <button
            key={key}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              active === key
                ? "bg-[var(--ink)] text-[var(--surface-strong)]"
                : "bg-white/60 text-[var(--ink-soft)] hover:text-[var(--ink)]",
            )}
            onClick={() => setActive(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {active === "overview" ? (
        <div className="rounded-[2rem] border border-[var(--line)] bg-white/80 p-6">
          <p className="text-base leading-8 text-[var(--ink)]">{output.campaignSummary}</p>
        </div>
      ) : null}

      {active === "calendar" ? (
        <div className="space-y-3">
          {calendarEntries.map((entry, index) => (
            <div
              key={`${entry.day}-${index}`}
              className="rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-medium text-[var(--ink)]">{entry.day}</p>
                <span className="text-sm text-[var(--ink-soft)]">{entry.platform}</span>
              </div>
              <p className="mt-3 text-sm text-[var(--ink)]">{entry.angle}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                CTA · {entry.callToAction}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {active === "captions" ? (
        <div className="space-y-3">
          {captions.map((caption, index) => (
            <div
              key={`${caption.headline}-${index}`}
              className="rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-5"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                {caption.platform}
              </p>
              <p className="mt-2 font-medium text-[var(--ink)]">{caption.headline}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--ink-soft)]">
                {caption.body}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {active === "hashtags" ? (
        <div className="space-y-3">
          {hashtags.map((item) => (
            <div
              key={item.platform}
              className="rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-5"
            >
              <p className="font-medium text-[var(--ink)]">{item.platform}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                {item.tags.join(" ")}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {active === "imagePrompts" ? (
        <div className="space-y-3">
          {imagePrompts.map((item, index) => (
            <div
              key={`${item.assetType}-${index}`}
              className="rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-5"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                {item.assetType}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{item.prompt}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
