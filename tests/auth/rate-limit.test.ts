import { describe, expect, it } from "vitest";
import { consumeSecurityRateLimit } from "@/lib/auth/rate-limit";
import { runWithRollback } from "@/tests/helpers/transactions";

describe("auth rate limiting", () => {
  it("blocks repeated attempts inside the configured window", async () => {
    await runWithRollback(async (tx) => {
      const first = await consumeSecurityRateLimit(
        {
          type: "SIGN_IN_ATTEMPT",
          subject: "tester@example.com",
          maxAttempts: 2,
          windowMs: 1000 * 60,
        },
        tx,
      );

      const second = await consumeSecurityRateLimit(
        {
          type: "SIGN_IN_ATTEMPT",
          subject: "tester@example.com",
          maxAttempts: 2,
          windowMs: 1000 * 60,
        },
        tx,
      );

      const third = await consumeSecurityRateLimit(
        {
          type: "SIGN_IN_ATTEMPT",
          subject: "tester@example.com",
          maxAttempts: 2,
          windowMs: 1000 * 60,
        },
        tx,
      );

      expect(first.allowed).toBe(true);
      expect(second.allowed).toBe(true);
      expect(third.allowed).toBe(false);
    });
  });
});
