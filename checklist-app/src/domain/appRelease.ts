export type AppReleaseManifest = {
  platform: "android";
  version: string;
  buildVersion: number;
  publishedAt: string;
  downloadPageUrl: string;
  apkUrl: string;
  fileSizeBytes: number;
  sha256: string;
  releaseNotes: string[];
};

const DOWNLOAD_PAGE_ORIGIN = "https://donezo.mv-builds.com";
const APK_ORIGIN = "https://downloads.mv-builds.com";
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SHA_256 = /^[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOrigin(value: unknown, expectedOrigin: string): value is string {
  if (typeof value !== "string") return false;

  try {
    return new URL(value).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value)) return false;

  const date = new Date(value);
  const canonicalValue = value.includes(".") ? value : value.replace("Z", ".000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString() === canonicalValue;
}

export function parseAppReleaseManifest(value: unknown): AppReleaseManifest | null {
  if (!isRecord(value)) return null;

  const { apkUrl, buildVersion, downloadPageUrl, fileSizeBytes, platform, publishedAt, releaseNotes, sha256, version } = value;
  if (
    platform !== "android" ||
    typeof version !== "string" ||
    version.trim().length === 0 ||
    typeof buildVersion !== "number" ||
    !Number.isSafeInteger(buildVersion) ||
    buildVersion <= 0 ||
    !isIsoTimestamp(publishedAt) ||
    !hasOrigin(downloadPageUrl, DOWNLOAD_PAGE_ORIGIN) ||
    !hasOrigin(apkUrl, APK_ORIGIN) ||
    typeof fileSizeBytes !== "number" ||
    !Number.isSafeInteger(fileSizeBytes) ||
    fileSizeBytes <= 0 ||
    typeof sha256 !== "string" ||
    !SHA_256.test(sha256) ||
    !Array.isArray(releaseNotes) ||
    releaseNotes.length === 0 ||
    !releaseNotes.every((note) => typeof note === "string" && note.trim().length > 0)
  ) {
    return null;
  }

  return {
    platform,
    version,
    buildVersion,
    publishedAt,
    downloadPageUrl,
    apkUrl,
    fileSizeBytes,
    sha256,
    releaseNotes,
  };
}

export function isNewerAndroidRelease(release: AppReleaseManifest, installedBuild: string | null): boolean {
  const current = Number(installedBuild);
  return Number.isSafeInteger(current) && release.buildVersion > current;
}
