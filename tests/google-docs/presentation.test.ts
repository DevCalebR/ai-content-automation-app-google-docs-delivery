import { describe, expect, it } from "vitest";
import {
  getDeliveryReadinessItems,
  getDeliveryStatus,
  getGoogleDocsNotice,
} from "@/lib/google-docs/presentation";

describe("google docs presentation helpers", () => {
  it("returns a clear ready status when Google-account delivery is fully configured", () => {
    const status = getDeliveryStatus({
      activeMode: "USER_OAUTH",
      integrationStatus: "CONNECTED",
      oauthConnected: true,
      oauthRefreshReady: true,
      oauthReady: true,
      serviceAccountReady: true,
      hasFolder: true,
    });
    const checklist = getDeliveryReadinessItems({
      activeMode: "USER_OAUTH",
      integrationStatus: "CONNECTED",
      oauthConnected: true,
      oauthRefreshReady: true,
      oauthReady: true,
      serviceAccountReady: true,
      hasFolder: true,
    });

    expect(status).toEqual({
      badge: "Ready with Google account",
      summary:
        "Completed runs will create Google Docs directly in the connected user’s Drive folder.",
      nextStep:
        "Open any completed run from results or history and use Deliver to Google Docs.",
      technical: "USER_OAUTH",
    });
    expect(checklist.every((item) => item.ready)).toBe(true);
  });

  it("surfaces the missing next step when no folder has been saved yet", () => {
    const status = getDeliveryStatus({
      activeMode: null,
      integrationStatus: "NOT_CONNECTED",
      oauthConnected: false,
      oauthRefreshReady: false,
      oauthReady: true,
      serviceAccountReady: false,
      hasFolder: false,
    });
    const checklist = getDeliveryReadinessItems({
      activeMode: null,
      integrationStatus: "NOT_CONNECTED",
      oauthConnected: false,
      oauthRefreshReady: false,
      oauthReady: true,
      serviceAccountReady: false,
      hasFolder: false,
    });

    expect(status.badge).toBe("Connect a Google account");
    expect(status.nextStep).toContain("Connect a Google account below");
    expect(checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ready: false,
          label: "Choose and save a delivery path for this workspace",
        }),
        expect.objectContaining({
          ready: false,
          label: "Save the folder that should receive delivered content plans",
        }),
      ]),
    );
  });

  it("maps OAuth reconnect notices into actionable copy", () => {
    expect(getGoogleDocsNotice("oauth-refresh-required")).toEqual({
      tone: "error",
      message:
        "Google returned access without a durable refresh token. Reconnect the Google account and approve the requested access again before using My Drive delivery.",
    });
  });
});
