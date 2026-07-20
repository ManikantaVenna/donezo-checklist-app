import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import { isNewerAndroidRelease, parseAppReleaseManifest, type AppReleaseManifest } from "../domain/appRelease";
import { fetchLatestAndroidRelease } from "../lib/appReleases";

const LAST_ATTEMPT_KEY = "donezo:update:last-attempt-at";
const CACHED_RELEASE_KEY = "donezo:update:cached-release";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1_000;
const DEV_UPDATE_PREVIEW_RELEASE: AppReleaseManifest = {
  platform: "android",
  version: "1.0.7-preview",
  buildVersion: 10_007,
  publishedAt: "2026-07-20T00:00:00.000Z",
  downloadPageUrl: "http://localhost:8081/download/?donezoUpdatePreview=1",
  apkUrl: "https://downloads.mv-builds.com/Donezo-preview.apk",
  fileSizeBytes: 37_855_228,
  sha256: "0".repeat(64),
  releaseNotes: [
    "This is a local preview of the update pop-up.",
    "The real release page opens from the Update Donezo button.",
    "Production users only see this after latest.json points to a newer build.",
  ],
};
const storageWriteQueues = new Map<string, Promise<void>>();

export type AppUpdateContextValue = {
  installedVersion: string;
  installedBuildVersion: string | null;
  availableRelease: AppReleaseManifest | null;
  dismiss: () => void;
  openDownloadPage: () => Promise<void>;
};

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);
const KnownAppReleaseContext = createContext<AppReleaseManifest | null | undefined>(undefined);

type AppUpdateProviderProps = {
  children: ReactNode;
};

function parseCachedRelease(value: string | null): AppReleaseManifest | null {
  if (value === null) return null;

  try {
    return parseAppReleaseManifest(JSON.parse(value));
  } catch {
    return null;
  }
}

function parseAttemptTimestamp(value: string | null, now: number): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;

  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && timestamp >= 0 && timestamp <= now ? timestamp : null;
}

async function getStoredValue(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStoredValue(key: string, value: string): Promise<void> {
  const previousWrite = storageWriteQueues.get(key) ?? Promise.resolve();
  const currentWrite = previousWrite
    .catch(() => undefined)
    .then(async () => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch {
        // Update metadata is optional and must never interrupt the app.
      }
    });

  storageWriteQueues.set(key, currentWrite);
  void currentWrite.then(() => {
    if (storageWriteQueues.get(key) === currentWrite) storageWriteQueues.delete(key);
  });
  return currentWrite;
}

function isDevUpdatePreviewRequested(): boolean {
  if (Platform.OS !== "web") return false;

  const devFlag = (globalThis as { __DEV__?: boolean }).__DEV__;
  const isDevMode = devFlag === undefined ? process.env.NODE_ENV !== "production" : devFlag;
  if (!isDevMode) return false;

  const location = (globalThis as { location?: { search?: unknown } }).location;
  const search = typeof location?.search === "string" ? location.search : "";
  return /(?:^\?|&)donezoUpdatePreview=1(?:&|$)/.test(search);
}

async function waitForStoredWrites(key: string): Promise<void> {
  const pendingWrite = storageWriteQueues.get(key);
  if (pendingWrite === undefined) return;

  try {
    await pendingWrite;
  } catch {
    // Queued persistence is best-effort and must never deadlock initialization.
  }
}

export function AppUpdateProvider({ children }: AppUpdateProviderProps) {
  const installedVersion = Application.nativeApplicationVersion ?? "Unknown";
  const installedBuildVersion = Application.nativeBuildVersion;
  const [knownRelease, setKnownRelease] = useState<AppReleaseManifest | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isDevUpdatePreviewRequested()) {
      setKnownRelease(DEV_UPDATE_PREVIEW_RELEASE);
      return;
    }

    if (Platform.OS !== "android") return;

    let mounted = true;
    let initialized = false;
    let checkInFlight = false;
    let lastAttemptAt: number | null = null;
    let selectedRelease: AppReleaseManifest | null = null;
    let cacheReady = false;

    const selectRelease = (release: AppReleaseManifest, persist: boolean) => {
      if (
        !mounted ||
        !cacheReady ||
        !isNewerAndroidRelease(release, installedBuildVersion) ||
        (selectedRelease !== null && selectedRelease.buildVersion >= release.buildVersion)
      ) {
        return;
      }

      selectedRelease = release;
      setKnownRelease(release);
      if (persist) void setStoredValue(CACHED_RELEASE_KEY, JSON.stringify(release));
    };

    const checkForUpdate = async () => {
      if (checkInFlight) return;

      const attemptedAt = Date.now();
      if (lastAttemptAt !== null && attemptedAt - lastAttemptAt < CHECK_INTERVAL_MS) return;

      checkInFlight = true;
      lastAttemptAt = attemptedAt;

      try {
        await setStoredValue(LAST_ATTEMPT_KEY, String(attemptedAt));
        if (!mounted) return;

        const release = await fetchLatestAndroidRelease();
        if (!mounted || release === null) return;

        const validRelease = parseAppReleaseManifest(release);
        if (validRelease !== null) selectRelease(validRelease, true);
      } catch {
        // The release service is optional; offline and service errors stay silent.
      } finally {
        checkInFlight = false;
      }
    };

    const initialize = async () => {
      await waitForStoredWrites(CACHED_RELEASE_KEY);
      if (!mounted) return;
      cacheReady = true;

      const cachedValue = await getStoredValue(CACHED_RELEASE_KEY);
      if (!mounted) return;
      const cachedRelease = parseCachedRelease(cachedValue);
      if (cachedRelease !== null) selectRelease(cachedRelease, false);

      const now = Date.now();
      lastAttemptAt = parseAttemptTimestamp(await getStoredValue(LAST_ATTEMPT_KEY), now);
      initialized = true;
      if (mounted) void checkForUpdate();
    };

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && initialized && mounted) void checkForUpdate();
    });

    void initialize();

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [installedBuildVersion]);

  const dismiss = useCallback(() => setDismissed(true), []);
  const openDownloadPage = useCallback(async () => {
    if (knownRelease === null) return;

    try {
      await Linking.openURL(knownRelease.downloadPageUrl);
    } catch {
      // A missing browser must not produce an unhandled rejection.
    }
  }, [knownRelease]);
  const availableRelease = dismissed ? null : knownRelease;
  const value = useMemo<AppUpdateContextValue>(
    () => ({
      installedVersion,
      installedBuildVersion,
      availableRelease,
      dismiss,
      openDownloadPage,
    }),
    [availableRelease, dismiss, installedBuildVersion, installedVersion, openDownloadPage],
  );

  return (
    <KnownAppReleaseContext.Provider value={knownRelease}>
      <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>
    </KnownAppReleaseContext.Provider>
  );
}

export function useAppUpdate(): AppUpdateContextValue {
  const value = useContext(AppUpdateContext);
  if (!value) throw new Error("useAppUpdate must be used within AppUpdateProvider");
  return value;
}

export function useKnownAppRelease(): AppReleaseManifest | null {
  const value = useContext(KnownAppReleaseContext);
  if (value === undefined) throw new Error("useKnownAppRelease must be used within AppUpdateProvider");
  return value;
}
