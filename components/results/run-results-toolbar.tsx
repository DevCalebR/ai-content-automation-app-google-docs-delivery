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

function DownloadAction({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <a
      className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-strong)] px-4 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--panel-muted)]"
      href={href}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </a>
  );
}

export function RunResultsToolbar({
  copyAllText,
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">Export and reuse</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Copy the full run or download a stable export generated from the saved result.
            </p>
          </div>
          <CopyTextButton label="Copied all results." text={copyAllText} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
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
