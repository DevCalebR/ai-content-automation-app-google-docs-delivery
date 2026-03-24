import "server-only";

import type { Credentials, JWT, OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { env } from "@/lib/env";
import type { GoogleDocsAuthMode } from "@/lib/validations/google-docs";

export const GOOGLE_DOCS_SCOPES = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive",
];

export type GoogleDocsApiClients = {
  authMode: GoogleDocsAuthMode;
  auth: JWT | OAuth2Client;
  docs: ReturnType<typeof google.docs>;
  drive: ReturnType<typeof google.drive>;
};

export function hasGoogleDocsServiceAccountConfig() {
  return Boolean(
    env.GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL &&
      env.GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY,
  );
}

export function getGoogleDocsServiceAccountEmail() {
  return env.GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL ?? null;
}

export function getGoogleServiceAccountConfig() {
  if (!hasGoogleDocsServiceAccountConfig()) {
    throw new Error("Google Docs delivery is not configured on the server.");
  }

  return {
    email: env.GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL!,
    privateKey: env.GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  };
}

export function createGoogleServiceAccountAuth() {
  const config = getGoogleServiceAccountConfig();

  return new google.auth.JWT({
    email: config.email,
    key: config.privateKey,
    scopes: GOOGLE_DOCS_SCOPES,
  });
}

export function getGoogleDocsServiceAccountClients(): GoogleDocsApiClients {
  const auth = createGoogleServiceAccountAuth();

  return {
    authMode: "SERVICE_ACCOUNT",
    auth,
    docs: google.docs({
      version: "v1",
      auth,
    }),
    drive: google.drive({
      version: "v3",
      auth,
    }),
  };
}

export function getGoogleDocsClient() {
  return getGoogleDocsServiceAccountClients().docs;
}

export function getGoogleDriveClient() {
  return getGoogleDocsServiceAccountClients().drive;
}

export function hasGoogleDocsOAuthConfig() {
  return Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);
}

function getGoogleDocsOAuthConfig() {
  if (!hasGoogleDocsOAuthConfig()) {
    throw new Error("Google OAuth delivery is not configured on the server.");
  }

  return {
    clientId: env.GOOGLE_OAUTH_CLIENT_ID!,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
    redirectUri: new URL("/api/google-docs/callback", env.APP_URL).toString(),
  };
}

export function createGoogleOAuthClient() {
  const config = getGoogleDocsOAuthConfig();

  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );
}

export function getGoogleDocsOAuthAuthorizeUrl(state: string) {
  return createGoogleOAuthClient().generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: GOOGLE_DOCS_SCOPES,
    state,
  });
}

export function createGoogleDocsOAuthClients(tokens: Credentials): GoogleDocsApiClients {
  const auth = createGoogleOAuthClient();
  auth.setCredentials(tokens);

  return {
    authMode: "USER_OAUTH",
    auth,
    docs: google.docs({
      version: "v1",
      auth,
    }),
    drive: google.drive({
      version: "v3",
      auth,
    }),
  };
}
