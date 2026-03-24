import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { env } from "@/lib/env";

const SECRET_VERSION = "v1";
const IV_LENGTH = 12;

function deriveKey(purpose: string) {
  return createHash("sha256")
    .update(`${env.NEXTAUTH_SECRET}:${purpose}`)
    .digest();
}

export function encryptSecretValue(value: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("encrypt"), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    SECRET_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecretValue(value: string) {
  const [version, ivPart, authTagPart, encryptedPart] = value.split(".");

  if (
    version !== SECRET_VERSION ||
    !ivPart ||
    !authTagPart ||
    !encryptedPart
  ) {
    throw new Error("Secret value is not in a supported format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey("encrypt"),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function signStateValue(payload: string) {
  const signature = createHmac("sha256", deriveKey("state"))
    .update(payload)
    .digest("base64url");

  return `${SECRET_VERSION}.${payload}.${signature}`;
}

export function verifySignedStateValue(value: string) {
  const [version, payload, signature] = value.split(".");

  if (version !== SECRET_VERSION || !payload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", deriveKey("state"))
    .update(payload)
    .digest();
  const receivedSignature = Buffer.from(signature, "base64url");

  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    return null;
  }

  return payload;
}
