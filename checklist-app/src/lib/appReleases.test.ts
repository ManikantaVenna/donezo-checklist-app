import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLatestAndroidRelease, LATEST_ANDROID_RELEASE_URL } from "./appReleases";

const validManifest = {
  platform: "android",
  version: "1.4.0",
  buildVersion: 9,
  publishedAt: "2026-07-19T12:00:00.000Z",
  downloadPageUrl: "https://donezo.mv-builds.com/download/android",
  apkUrl: "https://downloads.mv-builds.com/donezo-1.4.0.apk",
  fileSizeBytes: 12_345_678,
  sha256: "a".repeat(64),
  releaseNotes: ["Improved offline sync."],
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const asFetch = (fetchImpl: ReturnType<typeof vi.fn>): typeof fetch => fetchImpl as unknown as typeof fetch;

afterEach(() => {
  vi.useRealTimers();
});

describe("fetchLatestAndroidRelease", () => {
  it("fetches the production manifest without caching", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response(validManifest));

    await expect(fetchLatestAndroidRelease(asFetch(fetchImpl))).resolves.toEqual(validManifest);
    expect(fetchImpl).toHaveBeenCalledWith(LATEST_ANDROID_RELEASE_URL, {
      signal: expect.any(AbortSignal),
      cache: "no-store",
    });
  });

  it("returns null for an HTTP failure", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({ error: "unavailable" }, 503));

    await expect(fetchLatestAndroidRelease(asFetch(fetchImpl))).resolves.toBeNull();
  });

  it("returns null for a network failure", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error("network unavailable"));

    await expect(fetchLatestAndroidRelease(asFetch(fetchImpl))).resolves.toBeNull();
  });

  it("returns null for malformed JSON", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("not json", { status: 200, headers: { "content-type": "application/json" } }),
    );

    await expect(fetchLatestAndroidRelease(asFetch(fetchImpl))).resolves.toBeNull();
  });

  it("returns null for a malformed manifest", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({ ...validManifest, platform: "ios" }));

    await expect(fetchLatestAndroidRelease(asFetch(fetchImpl))).resolves.toBeNull();
  });

  it("returns null when the request times out and clears the timer", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>((_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
    );

    const result = fetchLatestAndroidRelease(asFetch(fetchImpl));
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(result).resolves.toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
