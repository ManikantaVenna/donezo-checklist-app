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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
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
