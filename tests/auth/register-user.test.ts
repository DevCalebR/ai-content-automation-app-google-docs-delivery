import { describe, expect, it, vi } from "vitest";
import { registerUser } from "@/lib/auth/register";
import { runWithRollback } from "@/tests/helpers/transactions";

describe("registerUser", () => {
  it("returns only safe values and field errors when validation fails", async () => {
    const result = await registerUser({
      name: "A",
      email: "operator@example.com",
      password: "short",
    });

    expect(result).toEqual({
      status: "error",
      message: "Please correct the highlighted fields.",
      values: {
        name: "A",
        email: "operator@example.com",
      },
      fieldErrors: {
        name: "Enter your full name.",
        password: "Use at least 10 characters for your password.",
      },
    });
    expect("password" in result).toBe(false);
  });

  it("redirects verified existing users back to sign-in without echoing a password", async () => {
    await runWithRollback(async (tx) => {
      const email = `verified-${crypto.randomUUID()}@example.com`;

      await tx.user.create({
        data: {
          email,
          name: "Verified Operator",
          passwordHash: "hashed-password",
          emailVerified: new Date(),
        },
      });

      const result = await registerUser(
        {
          name: "Verified Operator",
          email,
          password: "SuperSecurePass123",
        },
        {
          database: tx,
          audit: vi.fn(),
          sendEmail: vi.fn(),
        },
      );

      expect(result).toEqual({
        status: "success",
        redirectTo: `/sign-in?registered=1&email=${encodeURIComponent(email)}`,
        email,
      });
      expect("password" in result).toBe(false);
    });
  });
});
