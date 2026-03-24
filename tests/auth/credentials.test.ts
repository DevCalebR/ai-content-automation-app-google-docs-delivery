import { hash } from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { runWithRollback } from "@/tests/helpers/transactions";

describe("credentials auth", () => {
  it("still authenticates valid users when security event storage is unavailable", async () => {
    await runWithRollback(async (tx) => {
      const email = `signin-${crypto.randomUUID()}@example.com`;
      const password = "SuperSecurePass123";

      await tx.user.create({
        data: {
          email,
          name: "Credential User",
          emailVerified: new Date(),
          passwordHash: await hash(password, 12),
        },
      });

      vi.spyOn(tx.securityEvent, "count").mockRejectedValue(
        new Error("SecurityEvent table missing."),
      );

      const result = await authorizeCredentials(
        {
          email,
          password,
        },
        {
          database: tx,
        },
      );

      expect(result).toEqual(
        expect.objectContaining({
          email,
          name: "Credential User",
        }),
      );
    });
  });
});
