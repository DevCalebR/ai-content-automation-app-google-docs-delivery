import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

const registerUserMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/register", () => ({
  registerUser: registerUserMock,
}));

describe("registerUserAction", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    registerUserMock.mockReset();
  });

  it("returns only a safe error state when registration fails", async () => {
    registerUserMock.mockResolvedValue({
      status: "error",
      message: "An account with this email already exists.",
    });

    const { registerUserAction } = await import("@/app/(auth)/actions");
    const formData = new FormData();
    formData.set("name", "Casey Operator");
    formData.set("email", "casey@example.com");
    formData.set("password", "SuperSecurePass123");

    const result = await registerUserAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "error",
      message: "An account with this email already exists.",
    });
    expect("password" in result).toBe(false);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to sign-in on success instead of returning the raw password", async () => {
    registerUserMock.mockResolvedValue({
      status: "success",
      redirectTo: "/sign-in?registered=1&email=casey%40example.com",
      email: "casey@example.com",
    });

    const { registerUserAction } = await import("@/app/(auth)/actions");
    const formData = new FormData();
    formData.set("name", "Casey Operator");
    formData.set("email", "casey@example.com");
    formData.set("password", "SuperSecurePass123");

    await expect(registerUserAction({ status: "idle" }, formData)).rejects.toThrow(
      "NEXT_REDIRECT:/sign-in?registered=1&email=casey%40example.com",
    );
    expect(redirectMock).toHaveBeenCalledWith(
      "/sign-in?registered=1&email=casey%40example.com",
    );
  });
});
