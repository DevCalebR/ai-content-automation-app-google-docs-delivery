import { describe, expect, it, vi } from "vitest";
import { registerUser } from "@/lib/auth/register";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { runWithRollback } from "@/tests/helpers/transactions";

describe("registerUser and authorizeCredentials", () => {
  it("creates a user without returning the raw password and still allows sign-in", async () => {
    await runWithRollback(async (tx) => {
      const email = `signup-${crypto.randomUUID()}@example.com`;
      const password = "SuperSecurePass123";

      const result = await registerUser(
        {
          name: "Casey Operator",
          email,
          password,
        },
        {
          database: tx,
          audit: vi.fn(),
        },
      );

      expect(result.status).toBe("success");
      if (result.status !== "success") {
        throw new Error("Expected registration success.");
      }

      expect(result.email).toBe(email);
      expect("password" in result).toBe(false);

      const storedUser = await tx.user.findUnique({
        where: { email },
      });

      expect(storedUser?.passwordHash).toBeTruthy();

      const sessionUser = await authorizeCredentials(
        {
          email,
          password,
        },
        {
          database: tx,
        },
      );

      expect(sessionUser?.email).toBe(email);
      expect(sessionUser?.id).toBe(storedUser?.id);
    });
  });
});
