import type { ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppReleaseManifest } from "../domain/appRelease";
import { useAppUpdate } from "../state/AppUpdateContext";
import { AppUpdateNotice } from "./AppUpdateNotice";

vi.mock("react-native", () => {
  const { createElement } = require("react") as typeof import("react");
  const host =
    (name: string) =>
    ({ children, ...props }: { children?: unknown }) =>
      createElement(name, props, children as never);

  return {
    Modal: host("Modal"),
    Pressable: host("Pressable"),
    StyleSheet: { create: <T,>(styles: T) => styles },
    Text: host("Text"),
    View: host("View"),
  };
});

vi.mock("../state/AppUpdateContext", () => ({
  useAppUpdate: vi.fn(),
}));

const release: AppReleaseManifest = {
  platform: "android",
  version: "1.0.6",
  buildVersion: 9,
  publishedAt: "2026-07-19T12:00:00.000Z",
  downloadPageUrl: "https://donezo.mv-builds.com/download",
  apkUrl: "https://downloads.mv-builds.com/Donezo-1.0.6-build-9.apk",
  fileSizeBytes: 39_384_576,
  sha256: "a".repeat(64),
  releaseNotes: ["Streaks stay visible.", "Premium reward tiers.", "Faster startup.", "Not displayed."],
};

const dismiss = vi.fn();
const openDownloadPage = vi.fn(async () => undefined);
let renderer: ReactTestRenderer | null = null;

function textOf(node: ReactTestInstance): string {
  return node.findAll((child) => String(child.type) === "Text").flatMap((child) => child.children).join("");
}

function pressable(label: string): ReactTestInstance {
  return renderer!.root.findAll((node) => String(node.type) === "Pressable").find((node) => textOf(node) === label)!;
}

beforeEach(() => {
  dismiss.mockReset();
  openDownloadPage.mockReset().mockResolvedValue(undefined);
  vi.mocked(useAppUpdate).mockReturnValue({
    installedVersion: "1.0.5",
    installedBuildVersion: "8",
    availableRelease: null,
    dismiss,
    openDownloadPage,
  });
});

afterEach(() => {
  renderer?.unmount();
  renderer = null;
});

describe("AppUpdateNotice", () => {
  it("renders nothing when no newer release is available", () => {
    act(() => {
      renderer = create(<AppUpdateNotice />);
    });

    expect(renderer!.toJSON()).toBeNull();
  });

  it("shows the version and no more than three release notes", () => {
    vi.mocked(useAppUpdate).mockReturnValue({
      installedVersion: "1.0.5",
      installedBuildVersion: "8",
      availableRelease: release,
      dismiss,
      openDownloadPage,
    });

    act(() => {
      renderer = create(<AppUpdateNotice />);
    });

    const text = renderer!.root.findAll((node) => String(node.type) === "Text").flatMap((node) => node.children);
    expect(text).toContain("Donezo 1.0.6 is ready");
    expect(text).toContain("Streaks stay visible.");
    expect(text).toContain("Premium reward tiers.");
    expect(text).toContain("Faster startup.");
    expect(text).not.toContain("Not displayed.");
  });

  it("dismisses the session notice from Later", () => {
    vi.mocked(useAppUpdate).mockReturnValue({
      installedVersion: "1.0.5",
      installedBuildVersion: "8",
      availableRelease: release,
      dismiss,
      openDownloadPage,
    });
    act(() => {
      renderer = create(<AppUpdateNotice />);
    });

    act(() => pressable("Later").props.onPress());

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("opens the validated page from Update Donezo", async () => {
    vi.mocked(useAppUpdate).mockReturnValue({
      installedVersion: "1.0.5",
      installedBuildVersion: "8",
      availableRelease: release,
      dismiss,
      openDownloadPage,
    });
    act(() => {
      renderer = create(<AppUpdateNotice />);
    });

    await act(async () => {
      pressable("Update Donezo").props.onPress();
    });

    expect(openDownloadPage).toHaveBeenCalledTimes(1);
  });
});
