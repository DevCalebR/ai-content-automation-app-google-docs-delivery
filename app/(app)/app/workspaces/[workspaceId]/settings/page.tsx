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
  const deliveryStatus = !googleDocsServerReady
    ? {
        badge: "Needs server setup",
        summary:
          "Google Docs delivery is unavailable because the server is missing the service account credentials it needs to create documents.",
        nextStep:
          "Add the Google service account email and private key to the server environment, then reload this page.",
        technical: "SERVER_NOT_CONFIGURED",
      }
    : integration?.status === "ERROR"
      ? {
          badge: "Connection needs attention",
          summary:
            "The workspace delivery destination could not be verified the last time settings were saved.",
          nextStep:
            "Check the shared folder ID and confirm the folder is shared with the delivery service account, then save the settings again.",
          technical: "ERROR",
        }
      : connectionMetadata
        ? {
            badge: "Ready for delivery",
            summary:
              "Completed runs can be delivered to the shared Google Drive folder configured for this workspace.",
            nextStep:
              "Open any completed run from history or results and use Deliver to Google Docs.",
            technical: integration?.status ?? "CONNECTED",
          }
        : {
            badge: "Not connected",
            summary:
              "Google Docs delivery is available, but this workspace does not have a shared Drive folder configured yet.",
            nextStep:
              "Follow the setup steps below, then save the folder ID and optional title prefix.",
            technical: integration?.status ?? "NOT_CONNECTED",
          };

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
          <Badge>{deliveryStatus.badge}</Badge>
        </div>
        <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
          Configure a shared Google Drive destination for this workspace and use it to
          deliver completed runs as Google Docs.
        </p>
        <div className="mt-5 rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel-strong)] p-5">
          <p className="font-medium text-[var(--ink)]">{deliveryStatus.summary}</p>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
            {deliveryStatus.nextStep}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            Technical status · {deliveryStatus.technical}
          </p>
        </div>
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
        <div className="mt-5 rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-5">
          <p className="font-medium text-[var(--ink)]">Setup steps</p>
          <ol className="mt-4 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
            <li>
              1. Choose or create a shared Google Drive folder for delivered content plans.
              This folder is where each completed run will create a Google Doc.
            </li>
            <li>
              2. Copy the folder ID from the Google Drive URL. In a folder URL such as
              {" "}
              <span className="font-medium text-[var(--ink)]">
                `https://drive.google.com/drive/folders/your-folder-id`
              </span>
              {" "}
              the folder ID is the part after
              {" "}
              <span className="font-medium text-[var(--ink)]">`/folders/`</span>.
            </li>
            <li>
              3. Share that folder with the workspace delivery service account shown below
              so the app can create documents inside it.
            </li>
            <li>
              4. Paste the folder ID into the form, then optionally add a document title
              prefix. The title prefix is added to the front of each delivered Google Doc
              title to keep exports organized across brands or clients.
            </li>
            <li>
              5. After setup is saved, completed runs can be delivered from the results page.
              The app will create a Google Doc in the shared folder and show the delivery
              status and document link in both results and run history.
            </li>
          </ol>
        </div>
        <div className="mt-5 rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-5 text-sm text-[var(--ink-soft)]">
          <p className="font-medium text-[var(--ink)]">Delivery service account</p>
          {serviceAccountEmail ? (
            <>
              <p className="mt-3 leading-7">
                Share the Google Drive folder with this email address:
              </p>
              <p className="mt-2 rounded-2xl bg-[var(--panel-strong)] px-4 py-3 font-medium text-[var(--ink)]">
                {serviceAccountEmail}
              </p>
              <p className="mt-3 leading-7">
                The server also needs the matching private key configured. If delivery still
                shows as unavailable after sharing the folder, verify the service account
                private key is set in the server environment.
              </p>
            </>
          ) : (
            <p className="mt-3 leading-7">
              The service account email is not available in this environment. That usually
              means the server is missing the Google Docs delivery service account email and
              private key configuration.
            </p>
          )}
        </div>
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
