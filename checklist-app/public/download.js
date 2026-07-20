(() => {
  "use strict";

  const MANIFEST_URL = "/releases/android/latest.json";
  const APK_ORIGIN = "https://downloads.mv-builds.com";
  const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  const SHA_256 = /^[a-f0-9]{64}$/;
  const UNAVAILABLE_MESSAGE = "The latest Donezo download is temporarily unavailable. Please try again later.";
  const LOCAL_PREVIEW_RELEASE = {
    platform: "android",
    version: "1.0.7-preview",
    buildVersion: 10_007,
    publishedAt: "2026-07-20T00:00:00.000Z",
    downloadPageUrl: "https://donezo.mv-builds.com/download",
    apkUrl: "https://downloads.mv-builds.com/Donezo-preview.apk",
    fileSizeBytes: 37_855_228,
    sha256: "0".repeat(64),
    releaseNotes: [
      "This is a local preview of the Donezo release page.",
      "The real page always displays the newest published APK.",
      "Installing a newer signed APK updates the existing app and keeps synced data.",
    ],
  };

  const elements = {
    version: document.querySelector("#version"),
    build: document.querySelector("#build"),
    publishedAt: document.querySelector("#published-at"),
    releaseNotes: document.querySelector("#release-notes"),
    fileSize: document.querySelector("#file-size"),
    sha256: document.querySelector("#sha256"),
    downloadButton: document.querySelector("#download-button"),
    status: document.querySelector("#status"),
  };

  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function isIsoTimestamp(value) {
    if (typeof value !== "string" || !ISO_TIMESTAMP.test(value)) return false;

    const date = new Date(value);
    const canonicalValue = value.includes(".") ? value : value.replace("Z", ".000Z");
    return !Number.isNaN(date.getTime()) && date.toISOString() === canonicalValue;
  }

  function getSafeApkUrl(value) {
    if (typeof value !== "string") throw new Error("Invalid download");

    const apk = new URL(value);
    if (apk.protocol !== "https:" || apk.username !== "" || apk.password !== "" || apk.origin !== APK_ORIGIN) {
      throw new Error("Invalid download");
    }
    return apk;
  }

  function parseRelease(value) {
    if (!isRecord(value)) throw new Error("Invalid release");

    const { apkUrl, buildVersion, downloadPageUrl, fileSizeBytes, platform, publishedAt, releaseNotes, sha256, version } = value;
    if (
      platform !== "android" ||
      typeof version !== "string" || version.trim().length === 0 ||
      typeof buildVersion !== "number" || !Number.isSafeInteger(buildVersion) || buildVersion <= 0 ||
      !isIsoTimestamp(publishedAt) ||
      typeof downloadPageUrl !== "string" ||
      typeof fileSizeBytes !== "number" || !Number.isSafeInteger(fileSizeBytes) || fileSizeBytes <= 0 ||
      typeof sha256 !== "string" || !SHA_256.test(sha256) ||
      !Array.isArray(releaseNotes) || releaseNotes.length === 0 ||
      !releaseNotes.every((note) => typeof note === "string" && note.trim().length > 0)
    ) {
      throw new Error("Invalid release");
    }

    const page = new URL(downloadPageUrl);
    if (page.protocol !== "https:" || page.username !== "" || page.password !== "" || page.origin !== "https://donezo.mv-builds.com") {
      throw new Error("Invalid release");
    }

    return { apk: getSafeApkUrl(apkUrl), buildVersion, fileSizeBytes, publishedAt, releaseNotes, sha256, version };
  }

  function formatFileSize(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: value >= 100 ? 0 : 1 }).format(value)} ${units[unit]}`;
  }

  function formatPublishedAt(value) {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(value));
  }

  function showUnavailable() {
    elements.downloadButton.removeAttribute("href");
    elements.downloadButton.setAttribute("aria-disabled", "true");
    elements.downloadButton.textContent = "Preparing latest release...";
    elements.status.dataset.state = "error";
    elements.status.textContent = UNAVAILABLE_MESSAGE;
  }

  function renderRelease(release) {
    elements.version.textContent = release.version;
    elements.build.textContent = String(release.buildVersion);
    elements.publishedAt.textContent = formatPublishedAt(release.publishedAt);
    elements.fileSize.textContent = formatFileSize(release.fileSizeBytes);
    elements.sha256.textContent = release.sha256;
    elements.releaseNotes.replaceChildren();
    for (const note of release.releaseNotes) {
      const item = document.createElement("li");
      item.textContent = note;
      elements.releaseNotes.append(item);
    }
    elements.downloadButton.href = release.apk.href;
    elements.downloadButton.removeAttribute("aria-disabled");
    elements.downloadButton.textContent = "Download Donezo for Android";
    elements.status.dataset.state = "ready";
    elements.status.textContent = "Ready to download the latest signed release.";
  }

  async function loadRelease() {
    try {
      const isLocalPreview =
        ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
        new URLSearchParams(window.location.search).get("donezoUpdatePreview") === "1";
      if (isLocalPreview) {
        renderRelease(parseRelease(LOCAL_PREVIEW_RELEASE));
        return;
      }

      const response = await fetch(MANIFEST_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("Release unavailable");
      renderRelease(parseRelease(await response.json()));
    } catch {
      showUnavailable();
    }
  }

  loadRelease();
})();
