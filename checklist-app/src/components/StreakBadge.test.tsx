import type { ReactTestRenderer } from "react-test-renderer";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StreakBadge } from "./StreakBadge";

const nativeMocks = vi.hoisted(() => ({
  isReduceMotionEnabled: vi.fn<() => Promise<boolean>>(),
  setValue: vi.fn(),
  timing: vi.fn(),
  useWindowDimensions: vi.fn(),
}));

vi.mock("react-native", () => {
  const { createElement } = require("react") as typeof import("react");
  const moduleApi = require("module") as {
    _extensions: Record<string, (loadedModule: { exports: unknown }, filename: string) => void>;
  };
  moduleApi._extensions[".png"] = (loadedModule, filename) => {
    loadedModule.exports = { uri: filename };
  };
  const host =
    (name: string) =>
    ({ children, ...props }: { children?: unknown }) =>
      createElement(name, props, children as never);

  class Value {
    setValue(value: number) {
      nativeMocks.setValue(value);
    }

    interpolate(config: unknown) {
      return { config };
    }
  }

  return {
    AccessibilityInfo: {
      isReduceMotionEnabled: nativeMocks.isReduceMotionEnabled,
    },
    Animated: {
      Value,
      View: host("AnimatedView"),
      timing: nativeMocks.timing,
    },
    Image: host("Image"),
    StyleSheet: {
      absoluteFill: { bottom: 0, left: 0, right: 0, top: 0 },
      create: <T,>(styles: T) => styles,
    },
    Text: host("Text"),
    View: host("View"),
    useWindowDimensions: nativeMocks.useWindowDimensions,
  };
});

vi.mock("expo-linear-gradient", () => {
  const { createElement } = require("react") as typeof import("react");

  return {
    LinearGradient: ({ children, ...props }: { children?: unknown }) =>
      createElement("LinearGradient", props, children as never),
  };
});

let renderer: ReactTestRenderer | null = null;

afterEach(() => {
  renderer?.unmount();
  renderer = null;
  vi.clearAllMocks();
});

function renderBadge(streak: number, options: { reducedMotion?: boolean; width?: number } = {}) {
  nativeMocks.isReduceMotionEnabled.mockResolvedValue(options.reducedMotion ?? false);
  nativeMocks.timing.mockReturnValue({ start: vi.fn() });
  nativeMocks.useWindowDimensions.mockReturnValue({
    fontScale: 1,
    height: 844,
    scale: 3,
    width: options.width ?? 390,
  });

  act(() => {
    renderer = create(<StreakBadge streak={streak} />);
  });
  return renderer!;
}

function flattenStyle(style: unknown): Record<string, unknown> {
  const styles = Array.isArray(style) ? style : [style];
  return Object.assign({}, ...styles.filter(Boolean));
}

describe("StreakBadge", () => {
  it("renders only the number and exposes the tier to accessibility", () => {
    const badge = renderBadge(63);

    expect(badge.root.findByProps({ accessibilityLabel: "63 day streak, Emerald tier" })).toBeDefined();
    expect(badge.root.findAll((node) => String(node.type) === "Text").map((node) => node.props.children)).toEqual([63]);
  });

  it("keeps 100-plus values in the Legend material", () => {
    const badge = renderBadge(127);

    expect(badge.root.findByProps({ accessibilityLabel: "127 day streak, Legend tier" })).toBeDefined();
  });

  it("uses the roomier badge dimensions on web and tablet widths", () => {
    const badge = renderBadge(63, { width: 900 });
    const frame = badge.root.findByProps({ accessibilityLabel: "63 day streak, Emerald tier" });

    expect(flattenStyle(frame.props.style)).toMatchObject({ height: 38, width: 50 });
  });

  it("uses compact medallion dimensions on phones", () => {
    const badge = renderBadge(2, { width: 390 });
    const frame = badge.root.findByProps({ accessibilityLabel: "2 day streak, Silver tier" });

    expect(flattenStyle(frame.props.style)).toMatchObject({ height: 34, width: 39 });
  });

  it("uses code-native material layers instead of image backdrops", () => {
    const badge = renderBadge(2, { width: 390 });

    expect(badge.root.findAll((node) => String(node.type) === "Image")).toHaveLength(0);
    expect(badge.root.findAll((node) => String(node.type) === "LinearGradient").length).toBeGreaterThanOrEqual(2);
  });

  it("does not replay the shimmer on initial load", () => {
    renderBadge(63);

    expect(nativeMocks.isReduceMotionEnabled).not.toHaveBeenCalled();
    expect(nativeMocks.timing).not.toHaveBeenCalled();
  });

  it("disables the decorative shimmer when reduced motion is enabled", async () => {
    const badge = renderBadge(62, { reducedMotion: true });

    await act(async () => {
      badge.update(<StreakBadge streak={63} />);
      await Promise.resolve();
    });

    expect(nativeMocks.isReduceMotionEnabled).toHaveBeenCalledOnce();
    expect(nativeMocks.timing).not.toHaveBeenCalled();
  });

  it("uses one restrained shimmer with a stronger duration at a tier boundary", async () => {
    const badge = renderBadge(14);

    await act(async () => {
      badge.update(<StreakBadge streak={15} />);
      await Promise.resolve();
    });

    expect(nativeMocks.timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 700, toValue: 1, useNativeDriver: true }),
    );
    expect(nativeMocks.timing).toHaveBeenCalledTimes(1);
  });
});
