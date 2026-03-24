import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createGoogleOAuthClient } from "@/lib/google-docs/client";
import {
  getGoogleDocsConnectionState,
  mergeGoogleDocsConnectionState,
} from "@/lib/google-docs/connection";
import {
  buildStoredGoogleOAuthTokens,
  readGoogleDocsOAuthStateToken,
} from "@/lib/google-docs/oauth";
import { logAuditEvent, logError } from "@/lib/logger";
import { getWorkspaceAuthorizationForUser } from "@/lib/workspaces/service";

function buildSettingsUrl(baseUrl: string, status: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("googleDocsStatus", status);
  return url;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const stateToken = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const state = stateToken ? readGoogleDocsOAuthStateToken(stateToken) : null;

  if (!state) {
    return Response.redirect(new URL("/app?googleDocsStatus=oauth-invalid-state", env.APP_URL));
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.redirect(buildSettingsUrl(state.returnTo, "oauth-session-expired"));
  }

  if (session.user.id !== state.userId) {
    return Response.redirect(buildSettingsUrl(state.returnTo, "oauth-session-mismatch"));
  }

  const authorization = await getWorkspaceAuthorizationForUser(state.workspaceId, session.user.id);

  if (!authorization?.isOwner) {
    return Response.redirect(buildSettingsUrl(state.returnTo, "oauth-forbidden"));
  }

  if (oauthError) {
    logAuditEvent({
      action: "google_docs.oauth.denied",
      userId: session.user.id,
      workspaceId: authorization.workspace.id,
      metadata: {
        error: oauthError,
      },
    });

    return Response.redirect(
      buildSettingsUrl(
        state.returnTo,
        oauthError === "access_denied" ? "oauth-cancelled" : "oauth-denied",
      ),
    );
  }

  if (!code) {
    return Response.redirect(buildSettingsUrl(state.returnTo, "oauth-failed"));
  }

  try {
    const existingConnection = await db.integrationConnection.findFirst({
      where: {
        workspaceId: authorization.workspace.id,
        provider: "GOOGLE_DOCS",
      },
    });
    const existingState = getGoogleDocsConnectionState(existingConnection);
    const oauthClient = createGoogleOAuthClient();
    const { tokens } = await oauthClient.getToken(code);

    if (!tokens.access_token && !tokens.refresh_token) {
      throw new Error("Google OAuth did not return any usable tokens.");
    }

    if (!tokens.refresh_token && !existingConnection?.encryptedRefreshToken) {
      logAuditEvent({
        action: "google_docs.oauth.refresh_token_missing",
        userId: session.user.id,
        workspaceId: authorization.workspace.id,
      });

      return Response.redirect(buildSettingsUrl(state.returnTo, "oauth-refresh-required"));
    }

    const storedTokens = buildStoredGoogleOAuthTokens(tokens, existingConnection);
    const metadata = mergeGoogleDocsConnectionState(existingState, {
      oauthConnectedAt: new Date().toISOString(),
    });
    const nextStatus = existingState?.folderId ? "CONNECTED" : "NOT_CONNECTED";

    await db.integrationConnection.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: authorization.workspace.id,
          provider: "GOOGLE_DOCS",
        },
      },
      create: {
        workspaceId: authorization.workspace.id,
        userId: session.user.id,
        provider: "GOOGLE_DOCS",
        status: nextStatus,
        metadata,
        ...storedTokens,
      },
      update: {
        userId: session.user.id,
        status: nextStatus,
        metadata,
        ...storedTokens,
      },
    });

    logAuditEvent({
      action: "google_docs.oauth.connected",
      userId: session.user.id,
      workspaceId: authorization.workspace.id,
      metadata: {
        status: nextStatus,
      },
    });

    return Response.redirect(buildSettingsUrl(state.returnTo, "oauth-connected"));
  } catch (error) {
    logError(error, "google-docs.oauth.callback");

    return Response.redirect(buildSettingsUrl(state.returnTo, "oauth-failed"));
  }
}
