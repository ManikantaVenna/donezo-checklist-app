import { describe, expect, it } from "vitest";
import { normalizePushSubscription, urlBase64ToUint8Array } from "./webPush";

describe("web push helpers", () => {
  it("converts a base64url VAPID public key to bytes", () => {
    const bytes = urlBase64ToUint8Array("AQIDBA");

    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });

  it("normalizes a browser push subscription for Supabase storage", () => {
    const normalized = normalizePushSubscription(
      {
        endpoint: "https://push.example/subscription-1",
        toJSON: () => ({
          endpoint: "https://push.example/subscription-1",
          keys: {
            p256dh: "client-public-key",
            auth: "client-auth-secret",
          },
        }),
      },
      "Mobile Safari",
    );

    expect(normalized).toEqual({
      endpoint: "https://push.example/subscription-1",
      p256dh: "client-public-key",
      auth: "client-auth-secret",
      userAgent: "Mobile Safari",
    });
  });

  it("rejects a subscription missing push encryption keys", () => {
    expect(() =>
      normalizePushSubscription(
        {
          endpoint: "https://push.example/subscription-1",
          toJSON: () => ({ endpoint: "https://push.example/subscription-1" }),
        },
        "Mobile Safari",
      ),
    ).toThrow("Push subscription is missing encryption keys.");
  });
});
