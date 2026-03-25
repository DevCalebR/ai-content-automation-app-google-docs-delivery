"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";
import {
  acceptRunSectionRefinementAction,
  refineRunSectionAction,
} from "@/app/(app)/app/actions";
import { Button } from "@/components/ui/button";
import { FormStateMessage, type ActionState } from "@/components/ui/form-state";
import { Textarea } from "@/components/ui/textarea";
import {
  getRefinableSectionLabel,
  type RefinableSectionKey,
  type RefinableSectionValueMap,
} from "@/lib/results/refinement";
import { cn } from "@/lib/utils";

const quickSuggestions = [
  "More professional",
  "Shorter",
  "More persuasive",
  "More niche-specific",
  "Less salesy",
] as const;

type SectionRefinementPanelProps<K extends RefinableSectionKey> = {
  currentContent: RefinableSectionValueMap[K];
  renderProposalPreview: (content: RefinableSectionValueMap[K]) => ReactNode;
  runId: string;
  sectionKey: K;
  workspaceId: string;
};

export function SectionRefinementPanel<K extends RefinableSectionKey>({
  currentContent,
  renderProposalPreview,
  runId,
  sectionKey,
  workspaceId,
}: SectionRefinementPanelProps<K>) {
  const router = useRouter();
  const sectionLabel = getRefinableSectionLabel(sectionKey);
  const [isOpen, setIsOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [feedback, setFeedback] = useState<ActionState>({ status: "idle" });
  const [proposal, setProposal] = useState<RefinableSectionValueMap[K] | null>(null);
  const [isRefining, startRefining] = useTransition();
  const [isAccepting, startAccepting] = useTransition();

  const isPending = isRefining || isAccepting;

  function resetPanel() {
    setFeedback({ status: "idle" });
    setProposal(null);
  }

  function handleSuggestionClick(value: string) {
    setInstruction((current) => {
      const trimmed = current.trim();

      if (!trimmed) {
        return value;
      }

      if (trimmed.toLowerCase().includes(value.toLowerCase())) {
        return current;
      }

      return `${trimmed}. ${value}`;
    });
  }

  function handleCancel() {
    resetPanel();
    setInstruction("");
    setIsOpen(false);
  }

  function handleDiscard() {
    handleCancel();
  }

  function handleRefineAgain() {
    setFeedback({ status: "idle" });
    setProposal(null);
  }

  function handleApply() {
    const nextInstruction = instruction.trim();

    if (!nextInstruction) {
      setFeedback({
        status: "error",
        message: "Enter a refinement instruction.",
      });
      return;
    }

    setFeedback({ status: "idle" });

    startRefining(async () => {
      try {
        const result = await refineRunSectionAction({
          workspaceId,
          runId,
          sectionKey,
          currentContent,
          instruction: nextInstruction,
        });

        if (result.status === "error") {
          setFeedback(result);
          return;
        }

        setProposal(result.revisedContent as RefinableSectionValueMap[K]);
        setFeedback({
          status: "success",
          message: "Revision ready. Review it below before saving it to this run.",
        });
      } catch {
        setFeedback({
          status: "error",
          message: "We couldn't refine that section right now.",
        });
      }
    });
  }

  function handleAccept() {
    if (!proposal) {
      return;
    }

    setFeedback({ status: "idle" });

    startAccepting(async () => {
      try {
        const result = await acceptRunSectionRefinementAction({
          workspaceId,
          runId,
          sectionKey,
          revisedContent: proposal,
        });

        if (result.status === "error") {
          setFeedback(result);
          return;
        }

        handleCancel();
        router.refresh();
      } catch {
        setFeedback({
          status: "error",
          message: "We couldn't save that section revision.",
        });
      }
    });
  }

  return (
    <div className="w-full max-w-full space-y-3">
      <Button
        disabled={isPending}
        onClick={() => {
          setFeedback({ status: "idle" });
          setIsOpen((current) => !current);
        }}
        size="sm"
        variant="secondary"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Refine with AI
      </Button>

      {isOpen ? (
        <div className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel-strong)] p-5">
          <p className="text-sm text-[var(--ink-soft)]">
            Only the {sectionLabel.toLowerCase()} section will be updated. The rest of the
            run stays unchanged unless you accept the revision.
          </p>

          {!proposal ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {quickSuggestions.map((suggestion) => (
                  <button
                    className={cn(
                      "rounded-full border border-[var(--line)] bg-white/80 px-3 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:bg-white",
                      isPending ? "cursor-not-allowed opacity-60" : "",
                    )}
                    disabled={isPending}
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <label
                  className="text-sm font-medium text-[var(--ink-soft)]"
                  htmlFor={`${sectionKey}-refinement-instruction`}
                >
                  What should change?
                </label>
                <Textarea
                  id={`${sectionKey}-refinement-instruction`}
                  onChange={(event) => setInstruction(event.target.value)}
                  placeholder={`Example: Make the ${sectionLabel.toLowerCase()} more concise and more specific to our niche.`}
                  value={instruction}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button disabled={isPending} onClick={handleApply}>
                  {isRefining ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Refining...
                    </>
                  ) : (
                    "Apply refinement"
                  )}
                </Button>
                <Button disabled={isPending} onClick={handleCancel} variant="ghost">
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-4 rounded-[1.5rem] border border-[var(--line)] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                  Proposed revision
                </p>
                <div className="mt-3">{renderProposalPreview(proposal)}</div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button disabled={isPending} onClick={handleAccept}>
                  {isAccepting ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Accept revision"
                  )}
                </Button>
                <Button disabled={isPending} onClick={handleDiscard} variant="ghost">
                  Discard
                </Button>
                <Button disabled={isPending} onClick={handleRefineAgain} variant="secondary">
                  Refine again
                </Button>
              </div>
            </>
          )}

          <div className="mt-4">
            <FormStateMessage state={feedback} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
