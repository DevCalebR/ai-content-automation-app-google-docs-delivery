import { afterEach, describe, expect, it, vi } from "vitest";

const BASE_ENV = {
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
  NEXTAUTH_SECRET: "12345678901234567890123456789012",
  OPENAI_API_KEY: "test-openai-key",
};

function setRuntimeEnv(overrides: Record<string, string | undefined> = {}) {
  vi.unstubAllEnvs();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_URL", BASE_ENV.APP_URL);
  vi.stubEnv("DATABASE_URL", BASE_ENV.DATABASE_URL);
  vi.stubEnv("OPENAI_API_KEY", BASE_ENV.OPENAI_API_KEY);
  vi.stubEnv("NEXTAUTH_SECRET", BASE_ENV.NEXTAUTH_SECRET);
  vi.stubEnv("NEXTAUTH_URL", BASE_ENV.APP_URL);

  delete process.env.DIRECT_DATABASE_URL;

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    vi.stubEnv(key, value);
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("env runtime parsing", () => {
  it("does not require DIRECT_DATABASE_URL for app runtime parsing", async () => {
    setRuntimeEnv();

    const { env } = await import("@/lib/env");

    expect(env.DIRECT_DATABASE_URL).toBeUndefined();
    expect(env.DATABASE_URL).toBe(BASE_ENV.DATABASE_URL);
  });

  it("treats a blank DIRECT_DATABASE_URL as absent", async () => {
    setRuntimeEnv({
      DIRECT_DATABASE_URL: "",
    });

    const { env } = await import("@/lib/env");

    expect(env.DIRECT_DATABASE_URL).toBeUndefined();
  });
});
