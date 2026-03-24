import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SubmitButton } from "@/components/ui/submit-button";

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");

  return {
    ...actual,
    useFormStatus: () => ({
      pending: false,
      data: null,
      method: "post",
      action: null,
    }),
  };
});

describe("SubmitButton", () => {
  it("defaults to a submit button so server-action forms actually post", () => {
    const markup = renderToStaticMarkup(<SubmitButton>Send</SubmitButton>);

    expect(markup).toContain('type="submit"');
    expect(markup).toContain(">Send<");
  });

  it("still allows explicit type overrides", () => {
    const markup = renderToStaticMarkup(<SubmitButton type="button">Cancel</SubmitButton>);

    expect(markup).toContain('type="button"');
  });
});
