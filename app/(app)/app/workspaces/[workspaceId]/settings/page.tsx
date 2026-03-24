import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { GoogleDocsSettingsForm } from "@/components/app/google-docs-settings-form";
import { WorkspaceSettingsForm } from "@/components/app/workspace-settings-form";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  getGoogleDocsServiceAccountEmail,
  hasGoogleDocsOAuthConfig,
  hasGoogleDocsServiceAccountConfig,
} from "@/lib/google-docs/client";
import {
  getGoogleDocsConnectionMetadata,
  getGoogleDocsConnectionState,
  hasGoogleDocsOAuthConnection,
  hasGoogleDocsOAuthRefreshToken,
} from "@/lib/google-docs/connection";
import { getWorkspaceAuthorizationForUser } from "@/lib/workspaces/service";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ googleDocsStatus?: string }>;
};

function getGoogleDocsNotice(status?: string) {
  switch (status) {
    case "oauth-connected":
      return {
        tone: "success" as const,
        message:
          "Google account access is connected. Save a folder in the My Drive section below to activate user-authorized delivery.",
      };
    case "oauth-cancelled":
      return {
        tone: "error" as const,
        message: "Google account connection was cancelled before access was granted.",
      };
    case "oauth-denied":
    case "oauth-failed":
      return {
        tone: "error" as const,
        message:
          "Google account connection could not be completed. Try connecting the workspace again.",
      };
    case "oauth-forbidden":
      return {
        tone: "error" as const,
        message: "Only workspace owners can connect or change Google Docs delivery settings.",
      };
    case "oauth-invalid-state":
    case "oauth-session-expired":
    case "oauth-session-mismatch":
      return {
        tone: "error" as const,
        message:
          "The Google account connection expired or no longer matched this session. Start the connection again from workspace settings.",
      };
    case "oauth-unavailable":
      return {
        tone: "error" as const,
        message:
          "Google account delivery is not configured on the server yet. Add the Google OAuth client ID and secret before connecting a workspace.",
      };
    case "oauth-refresh-required":
      return {
        tone: "error" as const,
        message:
          "Google returned access without a durable refresh token. Reconnect the Google account and approve the requested access again before using My Drive delivery.",
      };
    default:
      return null;
  }
}

type DeliveryStatus = {
  badge: string;
  summary: string;
  nextStep: string;
  technical: string;
};

function getDeliveryStatus(input: {
  activeMode: "SERVICE_ACCOUNT" | "USER_OAUTH" | null;
  integrationStatus?: "NOT_CONNECTED" | "CONNECTED" | "ERROR";
  oauthConnected: boolean;
  oauthRefreshReady: boolean;
  oauthReady: boolean;
  serviceAccountReady: boolean;
  hasFolder: boolean;
}): DeliveryStatus {
  if (input.integrationStatus === "ERROR") {
    return {
      badge: "Needs attention",
      summary:
        "The current Google Docs delivery destination could not be verified the last time settings were saved.",
      nextStep:
        "Open the matching delivery section below, confirm the folder ID and permissions, then save the settings again.",
      technical: "ERROR",
    };
  }

  if (input.activeMode === "USER_OAUTH" && input.hasFolder) {
    return {
      badge: "Ready with Google account",
      summary:
        "Completed runs will create Google Docs directly in the connected user’s Drive folder.",
      nextStep:
        "Open any completed run from results or history and use Deliver to Google Docs.",
      technical: "USER_OAUTH",
    };
  }

  if (input.activeMode === "SERVICE_ACCOUNT" && input.hasFolder) {
    return {
      badge: "Ready with service account",
      summary:
        "Completed runs will be delivered through the workspace service account configuration.",
      nextStep:
        "Use this mode for shared-folder delivery while My Drive OAuth rollout is still in progress.",
      technical: "SERVICE_ACCOUNT",
    };
  }

  if (input.oauthConnected && !input.oauthRefreshReady) {
    return {
      badge: "Reconnect Google account",
      summary:
        "This workspace has partial Google account access, but it is missing the refresh token needed for reliable My Drive delivery.",
      nextStep:
        "Reconnect the Google account below, then save the My Drive folder again if needed.",
      technical: "OAUTH_REFRESH_REQUIRED",
    };
  }

  if (input.oauthConnected) {
    return {
      badge: "Google account connected",
      summary:
        "This workspace has Google account access, but a delivery folder still needs to be saved for My Drive delivery.",
      nextStep:
        "Save a folder in the My Drive section below to make Google Docs delivery available.",
      technical: "OAUTH_CONNECTED_NO_FOLDER",
    };
  }

  if (input.oauthReady) {
    return {
      badge: "Connect a Google account",
      summary:
        "My Drive delivery is ready to be connected for this workspace, but no Google account has been authorized yet.",
      nextStep:
        "Connect a Google account below, then save a Drive folder to activate delivery.",
      technical: "OAUTH_READY",
    };
  }

  if (input.serviceAccountReady) {
    return {
      badge: "Service account available",
      summary:
        "The legacy service-account delivery path is available, but this workspace does not have an active folder configured.",
      nextStep:
        "Use the shared-folder section below if you need the service-account path while OAuth rollout is still in progress.",
      technical: "SERVICE_ACCOUNT_READY",
    };
  }

  return {
    badge: "Needs server setup",
    summary:
      "Google Docs delivery is unavailable because the server is missing both the Google OAuth app configuration and the service-account credentials used by the legacy delivery path.",
    nextStep:
      "Add either the Google OAuth client ID and secret for My Drive delivery, or the service-account credentials for the shared-folder fallback.",
    technical: "SERVER_NOT_CONFIGURED",
  };
}

export default async function SettingsPage({ params, searchParams }: PageProps) {
  const session = await requireSession();
  const { workspaceId } = await params;
  const search = await searchParams;
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
  const connectionState = getGoogleDocsConnectionState(integration);
  const connectionMetadata = getGoogleDocsConnectionMetadata(integration);
  const oauthReady = hasGoogleDocsOAuthConfig();
  const oauthConnected = hasGoogleDocsOAuthConnection(integration);
  const oauthRefreshReady = hasGoogleDocsOAuthRefreshToken(integration);
  const googleDocsServerReady = hasGoogleDocsServiceAccountConfig();
  const serviceAccountEmail = getGoogleDocsServiceAccountEmail();
  const activeMode = connectionMetadata?.authMode ?? null;
  const deliveryStatus = getDeliveryStatus({
    activeMode,
    integrationStatus: integration?.status,
    oauthConnected,
    oauthRefreshReady,
    oauthReady,
    serviceAccountReady: googleDocsServerReady,
    hasFolder: Boolean(connectionMetadata),
  });
  const googleDocsNotice = getGoogleDocsNotice(search.googleDocsStatus);
  const oauthSettingsHref = `/api/google-docs/connect?workspaceId=${workspace.id}`;
  const oauthFolderDefaults =
    activeMode === "USER_OAUTH"
      ? {
          folderId: connectionMetadata?.folderId,
          titlePrefix: connectionMetadata?.titlePrefix,
        }
      : {
          folderId: undefined,
          titlePrefix: connectionMetadata?.titlePrefix,
        };
  const serviceAccountDefaults =
    activeMode === "SERVICE_ACCOUNT"
      ? {
          folderId: connectionMetadata?.folderId,
          titlePrefix: connectionMetadata?.titlePrefix,
        }
      : {
          folderId: undefined,
          titlePrefix: connectionMetadata?.titlePrefix,
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
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-lg font-medium text-[var(--ink)]">Google Docs delivery</p>
          <Badge>{deliveryStatus.badge}</Badge>
        </div>
        <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
          Connect Google Docs delivery for this workspace, choose the active delivery path,
          and save the folder that should receive finished content plans.
        </p>
        <div className="mt-5 rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel-strong)] p-5">
          <p className="font-medium text-[var(--ink)]">{deliveryStatus.summary}</p>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
            {deliveryStatus.nextStep}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            Delivery mode · {deliveryStatus.technical}
          </p>
        </div>

        {googleDocsNotice ? (
          <div
            className={`mt-5 rounded-[1.75rem] border p-4 text-sm leading-7 ${
              googleDocsNotice.tone === "success"
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                : "border-[var(--danger)]/25 bg-[var(--danger)]/5 text-[var(--danger)]"
            }`}
          >
            {googleDocsNotice.message}
          </div>
        ) : null}

        <div className="mt-5 grid gap-5">
          <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-[var(--ink)]">
                  My Drive delivery via Google account
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                  Recommended for My Drive folders. The workspace owner connects a Google
                  account, then the app creates Google Docs directly inside that user’s
                  chosen folder.
                </p>
              </div>
              {activeMode === "USER_OAUTH" && connectionMetadata ? <Badge>ACTIVE</Badge> : null}
            </div>
            <div className="mt-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--ink-soft)]">
                <p className="font-medium text-[var(--ink)]">
                {oauthConnected
                  ? oauthRefreshReady
                    ? "Google account access is connected."
                    : "Reconnect the Google account to finish setup."
                  : "Google account is not connected yet."}
              </p>
              <p className="mt-2 leading-7">
                {oauthConnected
                  ? oauthRefreshReady
                    ? "After a folder is saved below, completed runs will use the connected Google account to create documents in that Drive location."
                    : "The current Google connection is missing the refresh token needed for durable delivery. Reconnect the account before saving or delivering to My Drive."
                  : "Connect a Google account first, then save the folder ID you want to receive delivered documents."}
              </p>
              {authorization.isOwner ? (
                oauthReady ? (
                  <Link
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-strong)] px-5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--panel-muted)]"
                    href={oauthSettingsHref}
                  >
                    {oauthConnected ? "Reconnect Google account" : "Connect Google account"}
                  </Link>
                ) : (
                  <p className="mt-4 text-sm leading-7">
                    Google OAuth is not configured on the server yet. Add
                    `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` before
                    using My Drive delivery.
                  </p>
                )
              ) : (
                <p className="mt-4 text-sm leading-7">
                  Only workspace owners can connect a Google account for delivery.
                </p>
              )}
            </div>
            <div className="mt-4">
              {authorization.isOwner ? (
                <GoogleDocsSettingsForm
                  authMode="USER_OAUTH"
                  initialFolderId={oauthFolderDefaults.folderId}
                  initialTitlePrefix={oauthFolderDefaults.titlePrefix}
                  modeReady={oauthReady}
                  oauthConnected={oauthConnected}
                  workspaceId={workspace.id}
                />
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/60 p-5 text-sm text-[var(--ink-soft)]">
                  Only workspace owners can change the My Drive delivery folder.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/80 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-[var(--ink)]">
                  Service account delivery
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                  Keep this path for the current shared-folder workflow. It remains useful
                  for shared-drive delivery while OAuth rollout is still in progress.
                </p>
              </div>
              {activeMode === "SERVICE_ACCOUNT" && connectionMetadata ? <Badge>ACTIVE</Badge> : null}
            </div>
            <div className="mt-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--ink-soft)]">
              <p className="font-medium text-[var(--ink)]">Workspace delivery service account</p>
              {serviceAccountEmail ? (
                <>
                  <p className="mt-2 leading-7">
                    Share the target folder with this service account when you want to use the
                    legacy shared-folder delivery path.
                  </p>
                  <p className="mt-3 rounded-2xl bg-white/80 px-4 py-3 font-medium text-[var(--ink)]">
                    {serviceAccountEmail}
                  </p>
                </>
              ) : (
                <p className="mt-2 leading-7">
                  The service account email is not available in this environment because the
                  server credentials are not configured.
                </p>
              )}
            </div>
            <div className="mt-4">
              {authorization.isOwner ? (
                <GoogleDocsSettingsForm
                  authMode="SERVICE_ACCOUNT"
                  initialFolderId={serviceAccountDefaults.folderId}
                  initialTitlePrefix={serviceAccountDefaults.titlePrefix}
                  modeReady={googleDocsServerReady}
                  serviceAccountEmail={serviceAccountEmail}
                  workspaceId={workspace.id}
                />
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/60 p-5 text-sm text-[var(--ink-soft)]">
                  Only workspace owners can change the service-account delivery folder.
                </div>
              )}
            </div>
          </div>
        </div>

        {connectionState?.folderId ? (
          <div className="mt-5 rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--ink-soft)]">
            <p>
              Active folder:
              {" "}
              <span className="font-medium text-[var(--ink)]">
                {connectionState.folderName ?? connectionState.folderId}
              </span>
            </p>
            <p className="mt-2">
              Title prefix:
              {" "}
              <span className="font-medium text-[var(--ink)]">
                {connectionState.titlePrefix || "None"}
              </span>
            </p>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
