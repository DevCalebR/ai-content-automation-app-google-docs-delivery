import { afterEach, describe, expect, it, vi } from "vitest";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/db";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("authOptions", () => {
  it("uses JWT sessions for credentials auth", () => {
    expect(authOptions.session?.strategy).toBe("jwt");
  });

  it("maps the JWT subject onto session.user.id", async () => {
    const sessionCallback = authOptions.callbacks?.session;

    expect(sessionCallback).toBeDefined();

    const session = await sessionCallback?.({
      session: {
        expires: new Date(Date.now() + 60_000).toISOString(),
        user: {
          email: "owner@example.com",
          id: "",
          name: "Owner",
        },
      },
      token: {
        sub: "user_123",
      },
    } as never);

    expect(session?.user).toBeDefined();

    if (!session?.user) {
      throw new Error("Expected session user to be defined.");
    }

    expect((session.user as { id: string }).id).toBe("user_123");
  });

  it("invalidates stale JWT sessions when the persisted auth state changes", async () => {
    const jwtCallback = authOptions.callbacks?.jwt;

    expect(jwtCallback).toBeDefined();

    vi.spyOn(db.user, "findUnique").mockResolvedValue({
      emailVerified: new Date(),
      updatedAt: new Date("2026-03-21T00:00:01.000Z"),
    } as never);

    const token = await jwtCallback?.({
      token: {
        authVersion: new Date("2026-03-21T00:00:00.000Z").getTime(),
        sub: "user_123",
      },
    } as never);

    expect(token).toEqual({});
  });
});
