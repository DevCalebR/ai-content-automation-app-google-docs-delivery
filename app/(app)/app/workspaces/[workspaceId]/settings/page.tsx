import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { GoogleDocsSettingsForm } from "@/components/app/google-docs-settings-form";
import { WorkspaceSettingsForm } from "@/components/app/workspace-settings-form";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  getGoogleDocsServiceAccountEmail,
  hasGoogleDocsServiceAccountConfig,
} from "@/lib/google-docs/client";
import { getGoogleDocsConnectionMetadata } from "@/lib/google-docs/connection";
import { getWorkspaceAuthorizationForUser } from "@/lib/workspaces/service";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function SettingsPage({ params }: PageProps) {
  const session = await requireSession();
  const { workspaceId } = await params;
  const authorization = await getWorkspaceAuthorizationForUser(workspaceId, session.user.id);

  if (!authorization) {
    notFound();
  }

  const workspace = authorization.workspace;

  const integration = await db.integrationConnection.findFirst({
    where: {
      workspaceId: workspace.id,
      provider: "GOOGLE_DOCS",
    },
  });
  const connectionMetadata = getGoogleDocsConnectionMetadata(integration);
  const googleDocsServerReady = hasGoogleDocsServiceAccountConfig();
  const serviceAccountEmail = getGoogleDocsServiceAccountEmail();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel className="p-7">
        <p className="section-heading">Settings</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-[var(--ink)]">
          Manage workspace settings
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
          Owners can update workspace details here, while members have read-only visibility
          into the current workspace setup.
        </p>
        <div className="mt-6">
          <Badge>{authorization.isOwner ? "OWNER" : authorization.membership.role}</Badge>
        </div>
        <div className="mt-8">
          {authorization.isOwner ? (
            <WorkspaceSettingsForm workspace={workspace} />
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] bg-white/60 p-6 text-sm text-[var(--ink-soft)]">
              Only workspace owners can change settings. You can still create briefs, run
              generations, and review saved outputs.
            </div>
          )}
        </div>
      </Panel>
      <Panel className="p-7">
        <p className="section-heading">Integrations</p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-lg font-medium text-[var(--ink)]">Google Docs delivery</p>
          <Badge>
            {!googleDocsServerReady
              ? "SERVER_NOT_CONFIGURED"
              : integration?.status ?? "NOT_CONNECTED"}
          </Badge>
        </div>
        <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
          Configure a shared Google Drive destination for this workspace and use it to
          deliver completed runs as Google Docs.
        </p>
        {connectionMetadata ? (
          <div className="mt-5 rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--ink-soft)]">
            <p>
              Connected folder:
              {" "}
              <span className="font-medium text-[var(--ink)]">
                {connectionMetadata.folderName ?? connectionMetadata.folderId}
              </span>
            </p>
            <p className="mt-2">
              Title prefix:
              {" "}
              <span className="font-medium text-[var(--ink)]">
                {connectionMetadata.titlePrefix || "None"}
              </span>
            </p>
          </div>
        ) : null}
        <div className="mt-6">
          {authorization.isOwner ? (
            <GoogleDocsSettingsForm
              initialFolderId={connectionMetadata?.folderId}
              initialTitlePrefix={connectionMetadata?.titlePrefix}
              serverReady={googleDocsServerReady}
              serviceAccountEmail={serviceAccountEmail}
              workspaceId={workspace.id}
            />
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-[var(--line)] bg-white/60 p-6 text-sm text-[var(--ink-soft)]">
              Only workspace owners can change Google Docs delivery settings.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
