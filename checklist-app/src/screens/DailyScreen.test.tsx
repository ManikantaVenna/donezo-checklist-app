import type { ReactTestRenderer } from "react-test-renderer";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChecklistSnapshot } from "../domain/types";
import { DailyScreen } from "./DailyScreen";

const checklist = vi.hoisted(() => ({
  getDailyStreak: vi.fn(),
  useChecklist: vi.fn(),
}));

const streakBadge = vi.hoisted(() => vi.fn(({ streak }: { streak: number }) => {
  const { createElement } = require("react") as typeof import("react");
  return createElement("StreakBadge", { accessibilityLabel: `${streak} day streak, Diamond tier` });
}));

vi.mock("react-native", () => {
  const { createElement } = require("react") as typeof import("react");
  const host =
    (name: string) =>
    ({ children, ...props }: { children?: unknown }) =>
      createElement(name, props, children as never);

  return {
    ActivityIndicator: host("ActivityIndicator"),
    ScrollView: host("ScrollView"),
    StyleSheet: { create: <T,>(styles: T) => styles },
    Text: host("Text"),
    View: host("View"),
  };
});

vi.mock("../state/ChecklistContext", () => checklist);
vi.mock("../components/StreakBadge", () => ({ StreakBadge: streakBadge }));

const snapshot: ChecklistSnapshot = {
  tasks: [
    {
      id: "daily-1",
      userId: "user-1",
      projectId: null,
      type: "daily",
      title: "Morning reflection",
      sortOrder: 0,
      isArchived: false,
      completedAt: null,
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:00:00.000Z",
    },
  ],
  projects: [],
  dailyCompletions: [],
  reminderPreferences: { userId: "user-1", enabled: false, reminderTime: "09:00" },
  timezone: "America/New_York",
};

let renderer: ReactTestRenderer | null = null;

afterEach(() => {
  renderer?.unmount();
  renderer = null;
  vi.clearAllMocks();
});

describe("DailyScreen", () => {
  it("renders each routine with the shared number-only streak badge", () => {
    checklist.useChecklist.mockReturnValue({
      snapshot,
      todayLocalDate: "2026-07-19",
      loading: false,
      error: null,
    });
    checklist.getDailyStreak.mockReturnValue(48);

    act(() => {
      renderer = create(<DailyScreen />);
    });

    expect(checklist.getDailyStreak).toHaveBeenCalledWith(snapshot, "daily-1", "2026-07-19");
    expect(streakBadge).toHaveBeenCalledWith({ streak: 48 }, undefined);
    expect(renderer!.root.findByProps({ accessibilityLabel: "48 day streak, Diamond tier" })).toBeDefined();
    expect(renderer!.root.findAll((node) => String(node.type) === "Text").some((node) => node.props.children === "48d")).toBe(false);
  });
});
