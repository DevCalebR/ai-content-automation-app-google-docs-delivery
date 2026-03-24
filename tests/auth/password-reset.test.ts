import { hash } from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { requestPasswordReset, resetPassword } from "@/lib/auth/password-reset";
import { runWithRollback } from "@/tests/helpers/transactions";

describe("password reset flow", () => {
  it("returns a generic reset response and updates the password when the token is redeemed", async () => {
    await runWithRollback(async (tx) => {
      const email = `reset-${crypto.randomUUID()}@example.com`;
      const originalPassword = "SuperSecurePass123";
      const newPassword = "EvenMoreSecurePass456";
      const delivered: { previewUrl?: string }[] = [];

      const user = await tx.user.create({
        data: {
          email,
          name: "Reset User",
          emailVerified: new Date(),
          passwordHash: await hash(originalPassword, 12),
          sessions: {
            create: {
              sessionToken: crypto.randomUUID(),
              expires: new Date(Date.now() + 1000 * 60 * 60),
            },
          },
        },
      });

      const existingResult = await requestPasswordReset(
        { email },
        {
          database: tx,
          audit: vi.fn(),
          sendEmail: async (message) => {
            delivered.push(message);
          },
        },
      );

      const missingResult = await requestPasswordReset(
        { email: `missing-${crypto.randomUUID()}@example.com` },
        {
          database: tx,
          audit: vi.fn(),
          sendEmail: async () => undefined,
        },
      );

      expect(existingResult).toEqual(missingResult);
      expect(delivered[0]?.previewUrl).toContain("/reset-password?");

      const resetUrl = new URL(delivered[0]!.previewUrl!);
      const token = resetUrl.searchParams.get("token");

      const resetResult = await resetPassword(
        {
          email,
          token,
          password: newPassword,
        },
        {
          database: tx,
          audit: vi.fn(),
        },
      );

      expect(resetResult.status).toBe("success");
      expect(resetResult.redirectTo).toBe(
        `/sign-in?reset=1&email=${encodeURIComponent(email)}`,
      );

      const sessions = await tx.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(0);

      const oldPasswordAuth = await authorizeCredentials(
        {
          email,
          password: originalPassword,
        },
        {
          database: tx,
        },
      );

      const newPasswordAuth = await authorizeCredentials(
        {
          email,
          password: newPassword,
        },
        {
          database: tx,
        },
      );

      expect(oldPasswordAuth).toBeNull();
      expect(newPasswordAuth?.email).toBe(email);
    });
  });

  it("keeps forgot-password available when security event queries fail", async () => {
    await runWithRollback(async (tx) => {
      const email = `degraded-reset-${crypto.randomUUID()}@example.com`;
      const delivered: { previewUrl?: string }[] = [];

      await tx.user.create({
        data: {
          email,
          name: "Reset User",
          emailVerified: new Date(),
          passwordHash: await hash("SuperSecurePass123", 12),
        },
      });

      vi.spyOn(tx.securityEvent, "count").mockRejectedValue(
        new Error("SecurityEvent table missing."),
      );

      const result = await requestPasswordReset(
        { email },
        {
          database: tx,
          audit: vi.fn(),
          sendEmail: async (message) => {
            delivered.push(message);
          },
        },
      );

      expect(result).toEqual({
        status: "success",
        message:
          "If an account matches that address, a password reset link will arrive shortly.",
      });
      expect(delivered).toHaveLength(1);
      expect(delivered[0]?.previewUrl).toContain("/reset-password?");
    });
  });
});
