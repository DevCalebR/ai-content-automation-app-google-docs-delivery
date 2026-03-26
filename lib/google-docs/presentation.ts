export function getGoogleDocsNotice(status?: string) {
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
        message:
          "Google account connection was cancelled before access was granted.",
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
        message:
          "Only workspace owners can connect or change Google Docs delivery settings.",
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

export type DeliveryStatusInput = {
  activeMode: "SERVICE_ACCOUNT" | "USER_OAUTH" | null;
  integrationStatus?: "NOT_CONNECTED" | "CONNECTED" | "ERROR";
  oauthConnected: boolean;
  oauthRefreshReady: boolean;
  oauthReady: boolean;
  serviceAccountReady: boolean;
  hasFolder: boolean;
};

export type DeliveryStatus = {
  badge: string;
  summary: string;
  nextStep: string;
  technical: string;
};

export type DeliveryReadinessItem = {
  detail: string;
  label: string;
  ready: boolean;
};

export function getDeliveryStatus(input: DeliveryStatusInput): DeliveryStatus {
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

export function getDeliveryReadinessItems(
  input: DeliveryStatusInput,
): DeliveryReadinessItem[] {
  return [
    input.activeMode === "USER_OAUTH"
      ? {
          ready: true,
          label: "My Drive delivery path is selected",
          detail:
            "Completed runs will use the connected Google account after a folder is saved below.",
        }
      : input.activeMode === "SERVICE_ACCOUNT"
        ? {
            ready: true,
            label: "Service account delivery path is selected",
            detail:
              "Completed runs will use the shared-folder workflow after the folder is confirmed below.",
          }
        : {
            ready: false,
            label: "Choose and save a delivery path for this workspace",
            detail:
              "Select either the Google-account path for My Drive folders or the service-account path for shared-folder delivery.",
          },
    input.hasFolder
      ? {
          ready: true,
          label: "A delivery folder is saved for this workspace",
          detail:
            "Results and history will use the saved folder until you change it.",
        }
      : {
          ready: false,
          label: "Save the folder that should receive delivered content plans",
          detail:
            "Paste the folder ID below so completed runs know where to create the document.",
        },
    input.activeMode === "USER_OAUTH"
      ? input.oauthConnected && input.oauthRefreshReady
        ? {
            ready: true,
            label:
              "The connected Google account is ready for reliable delivery",
            detail:
              "The workspace has the refresh token required to keep creating Docs in My Drive.",
          }
        : input.oauthConnected
          ? {
              ready: false,
              label: "Reconnect the Google account to finish My Drive setup",
              detail:
                "The current connection is missing the refresh token needed for durable delivery.",
            }
          : {
              ready: false,
              label: "Connect a Google account for My Drive delivery",
              detail:
                "Authorize the workspace owner’s Google account before saving the My Drive folder.",
            }
      : input.activeMode === "SERVICE_ACCOUNT"
        ? input.serviceAccountReady
          ? {
              ready: true,
              label: "The server service account is configured",
              detail:
                "Share the target folder with the service account email shown below before delivering a run.",
            }
          : {
              ready: false,
              label: "Add the service-account credentials on the server",
              detail:
                "This shared-folder delivery path cannot work until the environment is configured.",
            }
        : input.oauthReady
          ? {
              ready: true,
              label: "The server is ready for Google-account delivery",
              detail:
                "A workspace owner can connect Google account access as soon as they choose My Drive delivery.",
            }
          : input.serviceAccountReady
            ? {
                ready: true,
                label: "The server is ready for service-account delivery",
                detail:
                  "Choose the shared-folder path below if you want to deliver before OAuth is connected.",
              }
            : {
                ready: false,
                label:
                  "The server still needs Google Docs delivery credentials",
                detail:
                  "Add either the OAuth app credentials or the service-account credentials before delivery can work.",
              },
  ];
}
