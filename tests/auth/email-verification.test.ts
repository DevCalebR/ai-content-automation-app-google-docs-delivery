import { hash } from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { resendVerificationEmail, verifyEmailAddress } from "@/lib/auth/email-verification";
import { registerUser } from "@/lib/auth/register";
import { runWithRollback } from "@/tests/helpers/transactions";

describe("email verification flow", () => {
  it("requires email verification before credentials auth succeeds", async () => {
    await runWithRollback(async (tx) => {
      const email = `signup-${crypto.randomUUID()}@example.com`;
      const password = "SuperSecurePass123";
      const delivered: { previewUrl?: string }[] = [];

      const registerResult = await registerUser(
        {
          name: "Casey Operator",
          email,
          password,
        },
        {
          database: tx,
          audit: vi.fn(),
          sendEmail: async (message) => {
            delivered.push(message);
          },
        },
      );

      expect(registerResult.status).toBe("success");
      if (registerResult.status !== "success") {
        throw new Error("Expected registration success.");
      }

      expect("password" in registerResult).toBe(false);
      expect(delivered[0]?.previewUrl).toContain("/verify-email?");

      const beforeVerification = await authorizeCredentials(
        {
          email,
          password,
        },
        {
          database: tx,
        },
      );

      expect(beforeVerification).toBeNull();

      const verificationUrl = new URL(delivered[0]!.previewUrl!);
      const token = verificationUrl.searchParams.get("token");

      const verifyResult = await verifyEmailAddress(
        {
          email,
          token: token ?? undefined,
        },
        {
          database: tx,
          audit: vi.fn(),
        },
      );

      expect(verifyResult).toEqual({
        status: "success",
        message: "Email verified. You can sign in now.",
      });

      const afterVerification = await authorizeCredentials(
        {
          email,
          password,
        },
        {
          database: tx,
        },
      );

      expect(afterVerification?.email).toBe(email);
    });
  });

  it("resend verification stays generic for missing accounts", async () => {
    await runWithRollback(async (tx) => {
      const missingEmail = `missing-${crypto.randomUUID()}@example.com`;
      const existingEmail = `existing-${crypto.randomUUID()}@example.com`;
      const delivered: { previewUrl?: string }[] = [];

      await tx.user.create({
        data: {
          email: existingEmail,
          name: "Existing Unverified",
          passwordHash: await hash("SuperSecurePass123", 12),
        },
      });

      const missingResult = await resendVerificationEmail(
        { email: missingEmail },
        {
          database: tx,
          audit: vi.fn(),
          sendEmail: async (message) => {
            delivered.push(message);
          },
        },
      );

      const existingResult = await resendVerificationEmail(
        { email: existingEmail },
        {
          database: tx,
          audit: vi.fn(),
          sendEmail: async (message) => {
            delivered.push(message);
          },
        },
      );

      expect(missingResult).toEqual(existingResult);
      expect(delivered).toHaveLength(1);
      expect(delivered[0]?.previewUrl).toContain("/verify-email?");
    });
  });
});
