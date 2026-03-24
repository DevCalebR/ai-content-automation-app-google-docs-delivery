import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import {
  getGoogleDocsOAuthAuthorizeUrl,
  hasGoogleDocsOAuthConfig,
} from "@/lib/google-docs/client";
import { createGoogleDocsOAuthStateToken } from "@/lib/google-docs/oauth";
import { env } from "@/lib/env";
import { getWorkspaceAuthorizationForUser } from "@/lib/workspaces/service";

function buildSettingsUrl(workspaceId: string, status?: string) {
  const url = new URL(`/app/workspaces/${workspaceId}/settings`, env.APP_URL);

  if (status) {
    url.searchParams.set("googleDocsStatus", status);
  }

  return url;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.redirect(new URL("/sign-in", env.APP_URL));
  }

  const requestUrl = new URL(request.url);
  const workspaceId = requestUrl.searchParams.get("workspaceId")?.trim();

  if (!workspaceId) {
    return Response.redirect(new URL("/app", env.APP_URL));
  }

  const authorization = await getWorkspaceAuthorizationForUser(workspaceId, session.user.id);

  if (!authorization?.isOwner) {
    return Response.redirect(buildSettingsUrl(workspaceId, "oauth-forbidden"));
  }

  if (!hasGoogleDocsOAuthConfig()) {
    return Response.redirect(buildSettingsUrl(workspaceId, "oauth-unavailable"));
  }

  const settingsUrl = buildSettingsUrl(workspaceId);
  const state = createGoogleDocsOAuthStateToken({
    workspaceId,
    userId: session.user.id,
    returnTo: settingsUrl.toString(),
  });

  return Response.redirect(getGoogleDocsOAuthAuthorizeUrl(state));
}
