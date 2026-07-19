import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReactNode } from "react";
import type { ReactTestRenderer } from "react-test-renderer";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppReleaseManifest } from "../domain/appRelease";
import { fetchLatestAndroidRelease } from "../lib/appReleases";
import { AppUpdateProvider, useAppUpdate, useKnownAppRelease } from "./AppUpdateContext";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

const native = vi.hoisted(() => ({
  appStateListener: null as ((state: string) => void) | null,
  removeListener: vi.fn(),
  openURL: vi.fn(async () => true),
  platform: { OS: "android" },
}));

vi.mock("react-native", () => ({
  AppState: {
    addEventListener: vi.fn((_event: string, listener: (state: string) => void) => {
      native.appStateListener = listener;
      return { remove: native.removeListener };
    }),
  },
  Linking: { openURL: native.openURL },
  Platform: native.platform,
}));

vi.mock("expo-application", () => ({
  nativeApplicationVersion: "1.0.5",
  nativeBuildVersion: "8",
}));

vi.mock("../lib/appReleases", () => ({
  fetchLatestAndroidRelease: vi.fn(),
}));

type AppUpdateValue = ReturnType<typeof useAppUpdate>;

const LAST_ATTEMPT_KEY = "donezo:update:last-attempt-at";
const CACHED_RELEASE_KEY = "donezo:update:cached-release";
const SIX_HOURS_MS = 6 * 60 * 60 * 1_000;
const NOW = new Date("2026-07-19T18:00:00.000Z");

const release: AppReleaseManifest = {
  platform: "android",
  version: "1.0.6",
  buildVersion: 9,
  publishedAt: "2026-07-19T12:00:00.000Z",
  downloadPageUrl: "https://donezo.mv-builds.com/download",
  apkUrl: "https://downloads.mv-builds.com/Donezo-1.0.6-build-9.apk",
  fileSizeBytes: 39_384_576,
  sha256: "a".repeat(64),
  releaseNotes: ["Streaks stay visible.", "Premium reward tiers."],
};

function releaseWithBuild(buildVersion: number): AppReleaseManifest {
  return {
    ...release,
    version: `1.0.${buildVersion}`,
    buildVersion,
    apkUrl: `https://downloads.mv-builds.com/Donezo-build-${buildVersion}.apk`,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

let renderer: ReactTestRenderer | null = null;

async function renderProvider(child: ReactNode = null) {
  const holder: { value: AppUpdateValue | null; knownRelease: AppReleaseManifest | null } = {
    value: null,
    knownRelease: null,
  };

  function Probe() {
    holder.value = useAppUpdate();
    holder.knownRelease = useKnownAppRelease();
    return <>{child}</>;
  }

  await act(async () => {
    renderer = create(
      <AppUpdateProvider>
        <Probe />
      </AppUpdateProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  return holder as { value: AppUpdateValue; knownRelease: AppReleaseManifest | null };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.mocked(AsyncStorage.getItem).mockReset().mockResolvedValue(null);
  vi.mocked(AsyncStorage.setItem).mockReset().mockResolvedValue(undefined);
  vi.mocked(fetchLatestAndroidRelease).mockReset().mockResolvedValue(release);
  native.appStateListener = null;
  native.removeListener.mockReset();
  native.openURL.mockReset().mockResolvedValue(true);
  native.platform.OS = "android";
});

afterEach(() => {
  renderer?.unmount();
  renderer = null;
  vi.useRealTimers();
});

describe("AppUpdateProvider", () => {
  it("renders children immediately while the startup network check remains pending", async () => {
    const pending = deferred<AppReleaseManifest | null>();
    vi.mocked(fetchLatestAndroidRelease).mockReturnValue(pending.promise);

    const updates = await renderProvider("Checklist ready");

    expect(renderer!.toJSON()).toBe("Checklist ready");
    expect(updates.value.installedVersion).toBe("1.0.5");
    expect(updates.value.installedBuildVersion).toBe("8");
    expect(fetchLatestAndroidRelease).toHaveBeenCalledTimes(1);

    pending.resolve(null);
    await act(async () => {
      await pending.promise;
    });
  });

  it("loads a valid newer cached release before a pending network response", async () => {
    const pending = deferred<AppReleaseManifest | null>();
    vi.mocked(fetchLatestAndroidRelease).mockReturnValue(pending.promise);
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => {
      if (key === CACHED_RELEASE_KEY) return JSON.stringify(release);
      return null;
    });

    const updates = await renderProvider();

    expect(updates.value.availableRelease).toEqual(release);
    pending.resolve(null);
    await act(async () => {
      await pending.promise;
    });
  });

  it("keeps a higher cached release when the network returns a lower newer build", async () => {
    const cachedRelease = releaseWithBuild(12);
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => {
      if (key === CACHED_RELEASE_KEY) return JSON.stringify(cachedRelease);
      return null;
    });
    vi.mocked(fetchLatestAndroidRelease).mockResolvedValue(releaseWithBuild(9));

    const updates = await renderProvider();

    expect(updates.value.availableRelease).toEqual(cachedRelease);
    expect(updates.knownRelease).toEqual(cachedRelease);
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(CACHED_RELEASE_KEY, JSON.stringify(releaseWithBuild(9)));
  });

  it("does not overwrite a higher cached release with a network build that is not newer than installed", async () => {
    const cachedRelease = releaseWithBuild(12);
    const installedRelease = releaseWithBuild(8);
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => {
      if (key === CACHED_RELEASE_KEY) return JSON.stringify(cachedRelease);
      return null;
    });
    vi.mocked(fetchLatestAndroidRelease).mockResolvedValue(installedRelease);

    const updates = await renderProvider();

    expect(updates.value.availableRelease).toEqual(cachedRelease);
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(CACHED_RELEASE_KEY, JSON.stringify(installedRelease));
  });

  it("checks once at startup, caches a newer release, and dismisses only the notice", async () => {
    const updates = await renderProvider();

    expect(fetchLatestAndroidRelease).toHaveBeenCalledTimes(1);
    expect(updates.value.availableRelease?.buildVersion).toBe(9);
    expect(updates.knownRelease?.buildVersion).toBe(9);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(LAST_ATTEMPT_KEY, String(NOW.getTime()));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(CACHED_RELEASE_KEY, JSON.stringify(release));

    act(() => updates.value.dismiss());

    expect(updates.value.availableRelease).toBeNull();
    expect(updates.knownRelease).toEqual(release);
  });

  it("does not delay a network release while its cache write is pending", async () => {
    const cacheWrite = deferred<void>();
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (key) => {
      if (key === CACHED_RELEASE_KEY) return cacheWrite.promise;
    });

    const updates = await renderProvider();

    expect(updates.value.availableRelease).toEqual(release);
    cacheWrite.resolve();
    await act(async () => {
      await cacheWrite.promise;
    });
  });

  it("does not fetch after unmount while the attempt timestamp write was pending", async () => {
    const timestampWrite = deferred<void>();
    vi.mocked(AsyncStorage.setItem).mockImplementation((key) => {
      if (key === LAST_ATTEMPT_KEY) return timestampWrite.promise;
      return Promise.resolve();
    });

    await renderProvider();
    expect(fetchLatestAndroidRelease).not.toHaveBeenCalled();

    act(() => renderer!.unmount());
    renderer = null;
    timestampWrite.resolve();
    await act(async () => {
      await timestampWrite.promise;
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchLatestAndroidRelease).not.toHaveBeenCalled();
  });

  it("serializes cache writes so a delayed older write cannot replace a newer release", async () => {
    const newerRelease = releaseWithBuild(12);
    const firstCacheWrite = deferred<void>();
    let cacheWriteCount = 0;
    let persistedCache: string | null = null;
    vi.mocked(fetchLatestAndroidRelease)
      .mockResolvedValueOnce(release)
      .mockResolvedValueOnce(newerRelease);
    vi.mocked(AsyncStorage.setItem).mockImplementation((key, value) => {
      if (key !== CACHED_RELEASE_KEY) return Promise.resolve();

      cacheWriteCount += 1;
      if (cacheWriteCount === 1) {
        return firstCacheWrite.promise.then(() => {
          persistedCache = value;
        });
      }

      persistedCache = value;
      return Promise.resolve();
    });

    const updates = await renderProvider();
    expect(updates.value.availableRelease).toEqual(release);

    vi.setSystemTime(NOW.getTime() + SIX_HOURS_MS);
    await act(async () => {
      native.appStateListener?.("active");
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(updates.value.availableRelease).toEqual(newerRelease);
    expect(cacheWriteCount).toBe(1);

    firstCacheWrite.resolve();
    await act(async () => {
      await firstCacheWrite.promise;
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(cacheWriteCount).toBe(2);
    expect(persistedCache).toBe(JSON.stringify(newerRelease));
  });

  it("orders cache writes across unmount and remount so the newer provider wins", async () => {
    const newerRelease = releaseWithBuild(12);
    const oldCacheWrite = deferred<void>();
    const storage = new Map<string, string>();
    let cacheWriteCount = 0;
    vi.mocked(fetchLatestAndroidRelease)
      .mockResolvedValueOnce(release)
      .mockResolvedValueOnce(newerRelease);
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => storage.get(key) ?? null);
    vi.mocked(AsyncStorage.setItem).mockImplementation((key, value) => {
      if (key !== CACHED_RELEASE_KEY) {
        storage.set(key, value);
        return Promise.resolve();
      }

      cacheWriteCount += 1;
      if (cacheWriteCount === 1) {
        return oldCacheWrite.promise.then(() => {
          storage.set(key, value);
        });
      }

      storage.set(key, value);
      return Promise.resolve();
    });

    const oldUpdates = await renderProvider();
    expect(oldUpdates.value.availableRelease).toEqual(release);
    expect(cacheWriteCount).toBe(1);

    act(() => renderer!.unmount());
    renderer = null;
    vi.setSystemTime(NOW.getTime() + SIX_HOURS_MS);
    const newUpdates = await renderProvider();
    const fetchCountBeforeCacheSettled = vi.mocked(fetchLatestAndroidRelease).mock.calls.length;
    const releaseBeforeCacheSettled = newUpdates.value.availableRelease;

    oldCacheWrite.resolve();
    await act(async () => {
      await oldCacheWrite.promise;
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchCountBeforeCacheSettled).toBe(1);
    expect(releaseBeforeCacheSettled).toBeNull();
    expect(newUpdates.value.availableRelease).toEqual(newerRelease);
    expect(cacheWriteCount).toBe(2);
    expect(storage.get(CACHED_RELEASE_KEY)).toBe(JSON.stringify(newerRelease));
    expect(storage.get(LAST_ATTEMPT_KEY)).toBe(String(NOW.getTime() + SIX_HOURS_MS));
  });

  it("waits for a higher release from the old provider before the remount considers a lower network build", async () => {
    const higherRelease = releaseWithBuild(12);
    const lowerRelease = releaseWithBuild(9);
    const oldCacheWrite = deferred<void>();
    const storage = new Map<string, string>();
    let cacheWriteCount = 0;
    vi.mocked(fetchLatestAndroidRelease)
      .mockResolvedValueOnce(higherRelease)
      .mockResolvedValueOnce(lowerRelease);
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => storage.get(key) ?? null);
    vi.mocked(AsyncStorage.setItem).mockImplementation((key, value) => {
      if (key !== CACHED_RELEASE_KEY) {
        storage.set(key, value);
        return Promise.resolve();
      }

      cacheWriteCount += 1;
      if (cacheWriteCount === 1) {
        return oldCacheWrite.promise.then(() => {
          storage.set(key, value);
        });
      }

      storage.set(key, value);
      return Promise.resolve();
    });

    const oldUpdates = await renderProvider();
    expect(oldUpdates.value.availableRelease).toEqual(higherRelease);
    expect(cacheWriteCount).toBe(1);

    act(() => renderer!.unmount());
    renderer = null;
    vi.setSystemTime(NOW.getTime() + SIX_HOURS_MS);
    const newUpdates = await renderProvider();
    const fetchCountBeforeCacheSettled = vi.mocked(fetchLatestAndroidRelease).mock.calls.length;
    const releaseBeforeCacheSettled = newUpdates.value.availableRelease;

    oldCacheWrite.resolve();
    await act(async () => {
      await oldCacheWrite.promise;
      for (let index = 0; index < 10; index += 1) await Promise.resolve();
    });

    expect(fetchCountBeforeCacheSettled).toBe(1);
    expect(releaseBeforeCacheSettled).toBeNull();
    expect(fetchLatestAndroidRelease).toHaveBeenCalledTimes(2);
    expect(newUpdates.value.availableRelease).toEqual(higherRelease);
    expect(storage.get(CACHED_RELEASE_KEY)).toBe(JSON.stringify(higherRelease));
    expect(cacheWriteCount).toBe(1);
  });

  it("continues remount initialization when the prior cache persistence fails", async () => {
    const higherRelease = releaseWithBuild(12);
    const lowerRelease = releaseWithBuild(9);
    const failedOldCacheWrite = deferred<void>();
    const storage = new Map<string, string>();
    let cacheWriteCount = 0;
    vi.mocked(fetchLatestAndroidRelease)
      .mockResolvedValueOnce(higherRelease)
      .mockResolvedValueOnce(lowerRelease);
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => storage.get(key) ?? null);
    vi.mocked(AsyncStorage.setItem).mockImplementation((key, value) => {
      if (key !== CACHED_RELEASE_KEY) {
        storage.set(key, value);
        return Promise.resolve();
      }

      cacheWriteCount += 1;
      if (cacheWriteCount === 1) return failedOldCacheWrite.promise;
      storage.set(key, value);
      return Promise.resolve();
    });

    await renderProvider();
    act(() => renderer!.unmount());
    renderer = null;
    vi.setSystemTime(NOW.getTime() + SIX_HOURS_MS);
    const newUpdates = await renderProvider();
    const fetchCountBeforeCacheSettled = vi.mocked(fetchLatestAndroidRelease).mock.calls.length;
    const releaseBeforeCacheSettled = newUpdates.value.availableRelease;

    failedOldCacheWrite.reject(new Error("cache unavailable"));
    await act(async () => {
      for (let index = 0; index < 10; index += 1) await Promise.resolve();
    });

    expect(fetchCountBeforeCacheSettled).toBe(1);
    expect(releaseBeforeCacheSettled).toBeNull();
    expect(fetchLatestAndroidRelease).toHaveBeenCalledTimes(2);
    expect(newUpdates.value.availableRelease).toEqual(lowerRelease);
    expect(storage.get(CACHED_RELEASE_KEY)).toBe(JSON.stringify(lowerRelease));
    expect(cacheWriteCount).toBe(2);
  });

  it("stops remount initialization after unmount while waiting for the prior cache", async () => {
    const oldCacheWrite = deferred<void>();
    vi.mocked(fetchLatestAndroidRelease)
      .mockResolvedValueOnce(releaseWithBuild(12))
      .mockResolvedValueOnce(releaseWithBuild(9));
    vi.mocked(AsyncStorage.setItem).mockImplementation((key) => {
      if (key === CACHED_RELEASE_KEY) return oldCacheWrite.promise;
      return Promise.resolve();
    });

    await renderProvider();
    act(() => renderer!.unmount());
    renderer = null;
    vi.setSystemTime(NOW.getTime() + SIX_HOURS_MS);
    await renderProvider();
    act(() => renderer!.unmount());
    renderer = null;
    const fetchCountBeforeCacheSettled = vi.mocked(fetchLatestAndroidRelease).mock.calls.length;

    oldCacheWrite.resolve();
    await act(async () => {
      await oldCacheWrite.promise;
      for (let index = 0; index < 10; index += 1) await Promise.resolve();
    });

    expect(fetchCountBeforeCacheSettled).toBe(1);
    expect(fetchLatestAndroidRelease).toHaveBeenCalledTimes(1);
  });

  it("orders attempt timestamps across unmount and remount before the new provider fetches", async () => {
    const newerRelease = releaseWithBuild(12);
    const oldTimestampWrite = deferred<void>();
    const storage = new Map<string, string>();
    let timestampWriteCount = 0;
    vi.mocked(fetchLatestAndroidRelease).mockResolvedValue(newerRelease);
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => storage.get(key) ?? null);
    vi.mocked(AsyncStorage.setItem).mockImplementation((key, value) => {
      if (key !== LAST_ATTEMPT_KEY) {
        storage.set(key, value);
        return Promise.resolve();
      }

      timestampWriteCount += 1;
      if (timestampWriteCount === 1) {
        return oldTimestampWrite.promise.then(() => {
          storage.set(key, value);
        });
      }

      storage.set(key, value);
      return Promise.resolve();
    });

    await renderProvider();
    expect(fetchLatestAndroidRelease).not.toHaveBeenCalled();
    expect(timestampWriteCount).toBe(1);

    act(() => renderer!.unmount());
    renderer = null;
    vi.setSystemTime(NOW.getTime() + SIX_HOURS_MS);
    const newUpdates = await renderProvider();

    expect(fetchLatestAndroidRelease).not.toHaveBeenCalled();
    expect(timestampWriteCount).toBe(1);

    oldTimestampWrite.resolve();
    await act(async () => {
      await oldTimestampWrite.promise;
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(timestampWriteCount).toBe(2);
    expect(fetchLatestAndroidRelease).toHaveBeenCalledTimes(1);
    expect(newUpdates.value.availableRelease).toEqual(newerRelease);
    expect(storage.get(LAST_ATTEMPT_KEY)).toBe(String(NOW.getTime() + SIX_HOURS_MS));
  });

  it("continues an ordered cache queue after an older write fails", async () => {
    const newerRelease = releaseWithBuild(12);
    const failedCacheWrite = deferred<void>();
    let persistedCache: string | null = null;
    let cacheWriteCount = 0;
    vi.mocked(fetchLatestAndroidRelease)
      .mockResolvedValueOnce(release)
      .mockResolvedValueOnce(newerRelease);
    vi.mocked(AsyncStorage.setItem).mockImplementation((key, value) => {
      if (key !== CACHED_RELEASE_KEY) return Promise.resolve();

      cacheWriteCount += 1;
      if (cacheWriteCount === 1) return failedCacheWrite.promise;
      persistedCache = value;
      return Promise.resolve();
    });

    const updates = await renderProvider();
    vi.setSystemTime(NOW.getTime() + SIX_HOURS_MS);
    await act(async () => {
      native.appStateListener?.("active");
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(updates.value.availableRelease).toEqual(newerRelease);

    failedCacheWrite.reject(new Error("storage unavailable"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(cacheWriteCount).toBe(2);
    expect(persistedCache).toBe(JSON.stringify(newerRelease));
  });

  it("throttles foreground checks for six hours and coalesces repeated active events", async () => {
    await renderProvider();
    expect(fetchLatestAndroidRelease).toHaveBeenCalledTimes(1);

    vi.setSystemTime(NOW.getTime() + SIX_HOURS_MS - 1);
    await act(async () => {
      native.appStateListener?.("active");
      await Promise.resolve();
    });
    expect(fetchLatestAndroidRelease).toHaveBeenCalledTimes(1);

    const pending = deferred<AppReleaseManifest | null>();
    vi.mocked(fetchLatestAndroidRelease).mockReturnValueOnce(pending.promise);
    vi.setSystemTime(NOW.getTime() + SIX_HOURS_MS);
    await act(async () => {
      native.appStateListener?.("active");
      native.appStateListener?.("active");
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchLatestAndroidRelease).toHaveBeenCalledTimes(2);

    pending.resolve(release);
    await act(async () => {
      await pending.promise;
    });
  });

  it("records the attempt before fetching and respects a recent stored attempt", async () => {
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => {
      if (key === LAST_ATTEMPT_KEY) return String(NOW.getTime() - SIX_HOURS_MS + 1);
      return null;
    });

    await renderProvider();
    expect(fetchLatestAndroidRelease).not.toHaveBeenCalled();

    vi.setSystemTime(NOW.getTime() + 1);
    await act(async () => {
      native.appStateListener?.("active");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(vi.mocked(AsyncStorage.setItem).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(fetchLatestAndroidRelease).mock.invocationCallOrder[0],
    );
  });

  it("uses the in-memory throttle when timestamp storage fails", async () => {
    vi.mocked(AsyncStorage.getItem).mockRejectedValue(new Error("storage read failed"));
    vi.mocked(AsyncStorage.setItem).mockRejectedValue(new Error("storage write failed"));

    await renderProvider();
    expect(fetchLatestAndroidRelease).toHaveBeenCalledTimes(1);

    vi.setSystemTime(NOW.getTime() + SIX_HOURS_MS - 1);
    await act(async () => {
      native.appStateListener?.("active");
      native.appStateListener?.("active");
      native.appStateListener?.("active");
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchLatestAndroidRelease).toHaveBeenCalledTimes(1);

    vi.setSystemTime(NOW.getTime() + SIX_HOURS_MS);
    await act(async () => {
      native.appStateListener?.("active");
      native.appStateListener?.("active");
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchLatestAndroidRelease).toHaveBeenCalledTimes(2);
  });

  it("fails silently offline and ignores a corrupt cached release", async () => {
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => {
      if (key === CACHED_RELEASE_KEY) return "{broken json";
      return "not-a-timestamp";
    });
    vi.mocked(fetchLatestAndroidRelease).mockRejectedValue(new Error("offline"));

    const updates = await renderProvider("Checklist ready");

    expect(renderer!.toJSON()).toBe("Checklist ready");
    expect(updates.value.availableRelease).toBeNull();
  });

  it("skips cache, listeners, and network outside Android", async () => {
    native.platform.OS = "web";

    const updates = await renderProvider();

    expect(updates.value.availableRelease).toBeNull();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(fetchLatestAndroidRelease).not.toHaveBeenCalled();
    expect(native.appStateListener).toBeNull();
  });

  it("removes its listener and ignores a fetch result after unmount", async () => {
    const pending = deferred<AppReleaseManifest | null>();
    vi.mocked(fetchLatestAndroidRelease).mockReturnValue(pending.promise);
    await renderProvider();

    act(() => renderer!.unmount());
    renderer = null;
    expect(native.removeListener).toHaveBeenCalledTimes(1);

    pending.resolve(release);
    await act(async () => {
      await pending.promise;
    });

    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(CACHED_RELEASE_KEY, expect.any(String));
  });

  it("opens only the known validated download page and swallows Linking failures", async () => {
    const updates = await renderProvider();

    await act(async () => {
      await updates.value.openDownloadPage();
    });
    expect(native.openURL).toHaveBeenCalledWith(release.downloadPageUrl);

    native.openURL.mockRejectedValueOnce(new Error("browser unavailable"));
    await expect(updates.value.openDownloadPage()).resolves.toBeUndefined();
  });
});
