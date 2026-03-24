import "server-only";

import type { Credentials } from "google-auth-library";
import type { IntegrationConnection } from "@prisma/client";
import { decryptSecretValue, encryptSecretValue, signStateValue, verifySignedStateValue } from "@/lib/security/secrets";

const GOOGLE_DOCS_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type GoogleDocsOAuthStatePayload = {
  workspaceId: string;
  userId: string;
  returnTo: string;
  expiresAt: number;
};

type GoogleDocsOAuthConnectionRecord = Pick<
  IntegrationConnection,
  "encryptedAccessToken" | "encryptedRefreshToken" | "expiresAt"
>;

export class GoogleDocsOAuthTokenError extends Error {
  readonly code: "missing_tokens" | "missing_refresh_token" | "invalid_tokens";

  constructor(
    code: "missing_tokens" | "missing_refresh_token" | "invalid_tokens",
    message: string,
  ) {
    super(message);
    this.name = "GoogleDocsOAuthTokenError";
    this.code = code;
  }
}

export function isGoogleDocsOAuthTokenError(error: unknown): error is GoogleDocsOAuthTokenError {
  return error instanceof GoogleDocsOAuthTokenError;
}

export function getGoogleDocsOAuthReconnectMessage() {
  return "Reconnect the Google account for this workspace before using My Drive delivery.";
}

export function createGoogleDocsOAuthStateToken(input: {
  workspaceId: string;
  userId: string;
  returnTo: string;
}) {
  const payload = Buffer.from(
    JSON.stringify({
      workspaceId: input.workspaceId,
      userId: input.userId,
      returnTo: input.returnTo,
      expiresAt: Date.now() + GOOGLE_DOCS_OAUTH_STATE_TTL_MS,
    } satisfies GoogleDocsOAuthStatePayload),
  ).toString("base64url");

  return signStateValue(payload);
}

export function readGoogleDocsOAuthStateToken(token: string) {
  const payload = verifySignedStateValue(token);

  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as GoogleDocsOAuthStatePayload;

    if (
      !parsed.workspaceId ||
      !parsed.userId ||
      !parsed.returnTo ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt < Date.now()
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function buildStoredGoogleOAuthTokens(tokens: Credentials, existing?: GoogleDocsOAuthConnectionRecord | null) {
  return {
    encryptedAccessToken: tokens.access_token
      ? encryptSecretValue(tokens.access_token)
      : existing?.encryptedAccessToken ?? null,
    encryptedRefreshToken: tokens.refresh_token
      ? encryptSecretValue(tokens.refresh_token)
      : existing?.encryptedRefreshToken ?? null,
    expiresAt: tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : existing?.expiresAt ?? null,
  };
}

export function getStoredGoogleOAuthTokens(connection: GoogleDocsOAuthConnectionRecord | null): Credentials {
  if (!connection?.encryptedAccessToken && !connection?.encryptedRefreshToken) {
    throw new GoogleDocsOAuthTokenError(
      "missing_tokens",
      getGoogleDocsOAuthReconnectMessage(),
    );
  }

  try {
    return {
      access_token: connection.encryptedAccessToken
        ? decryptSecretValue(connection.encryptedAccessToken)
        : undefined,
      refresh_token: connection.encryptedRefreshToken
        ? decryptSecretValue(connection.encryptedRefreshToken)
        : undefined,
      expiry_date: connection.expiresAt?.getTime(),
    };
  } catch {
    throw new GoogleDocsOAuthTokenError(
      "invalid_tokens",
      getGoogleDocsOAuthReconnectMessage(),
    );
  }
}
