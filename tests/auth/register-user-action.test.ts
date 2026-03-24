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
  const initialState = {
    status: "idle" as const,
    values: {
      name: "",
      email: "",
    },
    fieldErrors: {},
    submissionId: 0,
  };

  beforeEach(() => {
    redirectMock.mockClear();
    registerUserMock.mockReset();
  });

  it("returns only a safe error state when registration fails", async () => {
    registerUserMock.mockResolvedValue({
      status: "error",
      message: "Please correct the highlighted fields.",
      values: {
        name: "Casey Operator",
        email: "casey@example.com",
      },
      fieldErrors: {
        email: "Enter a valid work email.",
      },
    });

    const { registerUserAction } = await import("@/app/(auth)/actions");
    const formData = new FormData();
    formData.set("name", "Casey Operator");
    formData.set("email", "casey@example.com");
    formData.set("password", "SuperSecurePass123");

    const result = await registerUserAction(initialState, formData);

    expect(result).toEqual({
      status: "error",
      message: "Please correct the highlighted fields.",
      values: {
        name: "Casey Operator",
        email: "casey@example.com",
      },
      fieldErrors: {
        email: "Enter a valid work email.",
      },
      submissionId: 1,
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

    await expect(registerUserAction(initialState, formData)).rejects.toThrow(
      "NEXT_REDIRECT:/sign-in?registered=1&email=casey%40example.com",
    );
    expect(redirectMock).toHaveBeenCalledWith(
      "/sign-in?registered=1&email=casey%40example.com",
    );
  });
});
