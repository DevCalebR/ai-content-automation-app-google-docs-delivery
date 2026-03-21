import { env } from "@/lib/env";

function appLink(path: string) {
  return `${env.APP_URL}${path}`;
}

export function buildVerificationEmail(email: string, token: string) {
  const url = appLink(`/verify-email?email=${encodeURIComponent(email)}&token=${token}`);

  return {
    to: email,
    subject: "Verify your email",
    text: `Verify your email by opening this link: ${url}`,
    html: `<p>Verify your email to activate your account.</p><p><a href="${url}">Verify email</a></p>`,
    previewUrl: url,
  };
}

export function buildPasswordResetEmail(email: string, token: string) {
  const url = appLink(`/reset-password?email=${encodeURIComponent(email)}&token=${token}`);

  return {
    to: email,
    subject: "Reset your password",
    text: `Reset your password by opening this link: ${url}`,
    html: `<p>Reset your password with the secure link below.</p><p><a href="${url}">Reset password</a></p>`,
    previewUrl: url,
  };
}
