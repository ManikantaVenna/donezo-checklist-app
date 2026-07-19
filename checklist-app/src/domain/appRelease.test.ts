import { describe, expect, it } from "vitest";
import { isNewerAndroidRelease, parseAppReleaseManifest } from "./appRelease";

const validManifest = {
  platform: "android" as const,
  version: "1.4.0",
  buildVersion: 9,
  publishedAt: "2026-07-19T12:00:00.000Z",
  downloadPageUrl: "https://donezo.mv-builds.com/download/android",
  apkUrl: "https://downloads.mv-builds.com/donezo-1.4.0.apk",
  fileSizeBytes: 12_345_678,
  sha256: "a".repeat(64),
  releaseNotes: ["Improved offline sync."],
};

describe("parseAppReleaseManifest", () => {
  it("accepts the exact production manifest contract", () => {
    expect(parseAppReleaseManifest(validManifest)).toEqual(validManifest);
  });

  it("accepts a valid ISO timestamp with second precision", () => {
    const manifest = { ...validManifest, publishedAt: "2026-07-19T12:00:00Z" };

    expect(parseAppReleaseManifest(manifest)).toEqual(manifest);
  });

  it.each([
    { ...validManifest, platform: "ios" },
    { ...validManifest, version: "   " },
    { ...validManifest, buildVersion: 0 },
    { ...validManifest, buildVersion: Number.MAX_SAFE_INTEGER + 1 },
    { ...validManifest, publishedAt: "2026-02-30T12:00:00.000Z" },
    { ...validManifest, downloadPageUrl: "http://donezo.mv-builds.com/download" },
    { ...validManifest, downloadPageUrl: "https://example.com/download" },
    { ...validManifest, downloadPageUrl: "https://user:password@donezo.mv-builds.com/download" },
    { ...validManifest, downloadPageUrl: "blob:https://donezo.mv-builds.com/download" },
    { ...validManifest, apkUrl: "https://example.com/app.apk" },
    { ...validManifest, apkUrl: "https://user:password@downloads.mv-builds.com/app.apk" },
    { ...validManifest, apkUrl: "blob:https://downloads.mv-builds.com/app.apk" },
    { ...validManifest, fileSizeBytes: 0 },
    { ...validManifest, sha256: "A".repeat(64) },
    { ...validManifest, sha256: "not-a-checksum" },
    { ...validManifest, releaseNotes: [] },
    { ...validManifest, releaseNotes: ["  "] },
  ])("rejects unsafe or malformed metadata", (value) => {
    expect(parseAppReleaseManifest(value)).toBeNull();
  });
});

describe("isNewerAndroidRelease", () => {
  it("compares the native integer build instead of semantic text", () => {
    expect(isNewerAndroidRelease(validManifest, "8")).toBe(true);
    expect(isNewerAndroidRelease(validManifest, "9")).toBe(false);
  });

  it.each([null, "", "   ", "1e1", "0x8", "9007199254740992", "0", "00", "-0", "-1", "+1", "1.0"])(
    "rejects an invalid installed build %j",
    (installedBuild) => {
      expect(isNewerAndroidRelease(validManifest, installedBuild)).toBe(false);
    },
  );

  it.each(["1", "8", "0008", "9007199254740991"])("accepts a positive decimal installed build %s", (installedBuild) => {
    expect(isNewerAndroidRelease(validManifest, installedBuild)).toBe(installedBuild !== "9007199254740991");
  });
});
