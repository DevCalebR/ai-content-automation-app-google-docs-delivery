import "server-only";

import { google } from "googleapis";
import { env } from "@/lib/env";

const GOOGLE_DOCS_SCOPES = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive.file",
];

export function hasGoogleDocsServiceAccountConfig() {
  return Boolean(
    env.GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL &&
      env.GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY,
  );
}

export function getGoogleDocsServiceAccountEmail() {
  return env.GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL ?? null;
}

export function createGoogleServiceAccountAuth() {
  if (!hasGoogleDocsServiceAccountConfig()) {
    throw new Error("Google Docs delivery is not configured on the server.");
  }

  return new google.auth.JWT({
    email: env.GOOGLE_DOCS_SERVICE_ACCOUNT_EMAIL,
    key: env.GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: GOOGLE_DOCS_SCOPES,
  });
}

export function getGoogleDocsClient() {
  return google.docs({
    version: "v1",
    auth: createGoogleServiceAccountAuth(),
  });
}

export function getGoogleDriveClient() {
  return google.drive({
    version: "v3",
    auth: createGoogleServiceAccountAuth(),
  });
}
