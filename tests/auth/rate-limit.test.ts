import { beforeEach, describe, expect, it, vi } from "vitest";

const { logErrorMock } = vi.hoisted(() => ({
  logErrorMock: vi.fn(),
}));

vi.mock("@/lib/logger", async () => {
  const actual = await vi.importActual<typeof import("@/lib/logger")>("@/lib/logger");

  return {
    ...actual,
    logError: logErrorMock,
  };
});

import { consumeSecurityRateLimit } from "@/lib/auth/rate-limit";
import { runWithRollback } from "@/tests/helpers/transactions";

describe("auth rate limiting", () => {
  beforeEach(() => {
    logErrorMock.mockReset();
  });

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

  it("fails open when counting security events is unavailable", async () => {
    const result = await consumeSecurityRateLimit(
      {
        type: "SIGN_IN_ATTEMPT",
        subject: "tester@example.com",
        maxAttempts: 2,
        windowMs: 1000 * 60,
      },
      {
        securityEvent: {
          count: vi.fn().mockRejectedValue(new Error("SecurityEvent table missing.")),
          create: vi.fn(),
        },
      } as never,
    );

    expect(result).toEqual({
      allowed: true,
      degraded: true,
    });
    expect(logErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "count",
        type: "SIGN_IN_ATTEMPT",
      }),
      "auth.security_event",
    );
  });

  it("fails open when writing security events is unavailable", async () => {
    const result = await consumeSecurityRateLimit(
      {
        type: "PASSWORD_RESET_REQUEST",
        subject: "tester@example.com",
        maxAttempts: 2,
        windowMs: 1000 * 60,
      },
      {
        securityEvent: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockRejectedValue(new Error("SecurityEvent insert failed.")),
        },
      } as never,
    );

    expect(result).toEqual({
      allowed: true,
      degraded: true,
    });
    expect(logErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "create",
        type: "PASSWORD_RESET_REQUEST",
      }),
      "auth.security_event",
    );
  });
});
