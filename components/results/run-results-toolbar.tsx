"use client";

import Link from "next/link";
import { useActionState, useEffect, type ReactNode } from "react";
import { ExternalLink, FileDown, FileText, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RunDeliveryStatus } from "@prisma/client";
import { deliverRunToGoogleDocsAction } from "@/app/(app)/app/actions";
import { CopyTextButton } from "@/components/results/copy-text-button";
import { Button } from "@/components/ui/button";
import { FormStateMessage } from "@/components/ui/form-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialGoogleDocsDeliveryState } from "@/lib/google-docs/state";
import { cn } from "@/lib/utils";

function DownloadAction({
  href,
  icon,
  label,
  priority = "secondary",
}: {
  href: string;
  icon: ReactNode;
  label: string;
  priority?: "primary" | "secondary";
}) {
  return (
    <a
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-medium transition",
        priority === "primary"
          ? "h-11 border-[var(--line)] bg-[var(--ink)] px-5 text-sm text-[var(--surface-strong)] hover:bg-[#332b25]"
          : "h-9 border-[var(--line)] bg-[var(--panel-strong)] px-4 text-xs text-[var(--ink)] hover:bg-[var(--panel-muted)]",
      )}
      href={href}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </a>
  );
}

export function RunResultsToolbar({
  copyAllText,
  docxDownloadUrl,
  pdfDownloadUrl,
  markdownDownloadUrl,
  textDownloadUrl,
  workspaceId,
  runId,
  settingsHref,
  isOwner,
  googleDocsConnected,
  googleDocsServerReady,
  latestDelivery,
}: {
  copyAllText: string;
  docxDownloadUrl: string;
  pdfDownloadUrl: string;
  markdownDownloadUrl: string;
  textDownloadUrl: string;
  workspaceId: string;
  runId: string;
  settingsHref: string;
  isOwner: boolean;
  googleDocsConnected: boolean;
  googleDocsServerReady: boolean;
  latestDelivery?: {
    status: RunDeliveryStatus;
    externalUrl?: string | null;
    title?: string | null;
    errorMessage?: string | null;
  } | null;
}) {
  const router = useRouter();
  const [deliveryState, deliveryAction] = useActionState(
    deliverRunToGoogleDocsAction,
    initialGoogleDocsDeliveryState,
  );

  useEffect(() => {
    if (deliveryState.status !== "idle") {
      router.refresh();
    }
  }, [deliveryState.status, router]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
      <div className="rounded-[2rem] border border-[var(--line)] bg-white/80 p-5">
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">Export and reuse</p>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Download a polished client-ready export or copy the full saved run.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <DownloadAction
            href={docxDownloadUrl}
            icon={<FileText className="h-4 w-4" />}
            label="Download DOCX"
            priority="primary"
          />
          <DownloadAction
            href={pdfDownloadUrl}
            icon={<FileDown className="h-4 w-4" />}
            label="Download PDF"
            priority="primary"
          />
          <CopyTextButton
            label="Copied all results."
            size="default"
            text={copyAllText}
            variant="secondary"
          />
        </div>
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--panel-strong)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            Advanced exports
          </p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Keep markdown or plain text handy for technical workflows.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <DownloadAction
              href={markdownDownloadUrl}
              icon={<FileDown className="h-4 w-4" />}
              label="Download markdown"
            />
            <DownloadAction
              href={textDownloadUrl}
              icon={<FileText className="h-4 w-4" />}
              label="Download plain text"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-[var(--line)] bg-white/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">Google Docs delivery</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Deliver this run to the workspace Google Docs destination.
            </p>
          </div>
          {latestDelivery ? (
            <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs font-medium text-[var(--ink)]">
              {latestDelivery.status}
            </span>
          ) : null}
        </div>

        {latestDelivery?.externalUrl ? (
          <a
            className="mt-4 inline-flex items-center text-sm font-medium text-[var(--ink)] hover:text-[var(--accent)]"
            href={latestDelivery.externalUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open delivered doc
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        ) : null}

        {latestDelivery?.status === "FAILED" && latestDelivery.errorMessage ? (
          <p className="mt-4 text-sm text-[var(--danger)]">{latestDelivery.errorMessage}</p>
        ) : null}

        {!googleDocsServerReady ? (
          <p className="mt-4 text-sm text-[var(--ink-soft)]">
            Google Docs delivery is not configured on the server yet.
          </p>
        ) : !googleDocsConnected ? (
          <p className="mt-4 text-sm text-[var(--ink-soft)]">
            Set a shared Google Drive folder in workspace settings before delivering a run.
          </p>
        ) : !isOwner ? (
          <p className="mt-4 text-sm text-[var(--ink-soft)]">
            Only workspace owners can send runs to Google Docs.
          </p>
        ) : (
          <form action={deliveryAction} className="mt-5 space-y-4">
            <input name="workspaceId" type="hidden" value={workspaceId} />
            <input name="runId" type="hidden" value={runId} />
            <FormStateMessage state={deliveryState} />
            {deliveryState.documentUrl ? (
              <a
                className="inline-flex items-center text-sm font-medium text-[var(--ink)] hover:text-[var(--accent)]"
                href={deliveryState.documentUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open latest delivered doc
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            ) : null}
            <SubmitButton pendingLabel="Delivering to Google Docs...">
              <span className="inline-flex items-center">
                <Send className="mr-2 h-4 w-4" />
                Deliver to Google Docs
              </span>
            </SubmitButton>
          </form>
        )}

        {(!googleDocsConnected || !isOwner) && googleDocsServerReady ? (
          <div className="mt-5">
            <Link href={settingsHref}>
              <Button variant="secondary">Open delivery settings</Button>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
