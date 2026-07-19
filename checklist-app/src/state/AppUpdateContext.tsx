import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import { isNewerAndroidRelease, parseAppReleaseManifest, type AppReleaseManifest } from "../domain/appRelease";
import { fetchLatestAndroidRelease } from "../lib/appReleases";

const LAST_ATTEMPT_KEY = "donezo:update:last-attempt-at";
const CACHED_RELEASE_KEY = "donezo:update:cached-release";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1_000;

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

async function setStoredValue(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Update metadata is optional and must never interrupt the app.
  }
}

export function AppUpdateProvider({ children }: AppUpdateProviderProps) {
  const installedVersion = Application.nativeApplicationVersion ?? "Unknown";
  const installedBuildVersion = Application.nativeBuildVersion;
  const [knownRelease, setKnownRelease] = useState<AppReleaseManifest | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let mounted = true;
    let initialized = false;
    let checkInFlight = false;
    let lastAttemptAt: number | null = null;

    const checkForUpdate = async () => {
      if (checkInFlight) return;

      const attemptedAt = Date.now();
      if (lastAttemptAt !== null && attemptedAt - lastAttemptAt < CHECK_INTERVAL_MS) return;

      checkInFlight = true;
      lastAttemptAt = attemptedAt;
      await setStoredValue(LAST_ATTEMPT_KEY, String(attemptedAt));

      try {
        const release = await fetchLatestAndroidRelease();
        if (!mounted || release === null) return;

        void setStoredValue(CACHED_RELEASE_KEY, JSON.stringify(release));
        if (isNewerAndroidRelease(release, installedBuildVersion)) {
          setKnownRelease(release);
        }
      } catch {
        // The release service is optional; offline and service errors stay silent.
      } finally {
        checkInFlight = false;
      }
    };

    const initialize = async () => {
      const cachedValue = await getStoredValue(CACHED_RELEASE_KEY);
      const cachedRelease = parseCachedRelease(cachedValue);
      if (mounted && cachedRelease && isNewerAndroidRelease(cachedRelease, installedBuildVersion)) {
        setKnownRelease(cachedRelease);
      }

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
