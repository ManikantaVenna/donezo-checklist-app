import { type AppReleaseManifest, parseAppReleaseManifest } from "../domain/appRelease";

export const LATEST_ANDROID_RELEASE_URL = "https://donezo.mv-builds.com/releases/android/latest.json";

export async function fetchLatestAndroidRelease(fetchImpl: typeof fetch = fetch): Promise<AppReleaseManifest | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetchImpl(LATEST_ANDROID_RELEASE_URL, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    return parseAppReleaseManifest(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
