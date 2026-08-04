import type { ReactTestRenderer } from "react-test-renderer";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../domain/types";
import { TaskRow } from "./TaskRow";

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
    Pressable: host("Pressable"),
    StyleSheet: { create: <T,>(styles: T) => styles },
    Text: host("Text"),
    View: host("View"),
  };
});

vi.mock("./StreakBadge", () => ({ StreakBadge: streakBadge }));

const task: Task = {
  id: "task-1",
  userId: "user-1",
  projectId: null,
  type: "quick",
  title: "Ship the premium streak badge",
  sortOrder: 0,
  isArchived: false,
  completedAt: null,
  createdAt: "2026-07-19T00:00:00.000Z",
  updatedAt: "2026-07-19T00:00:00.000Z",
};

let renderer: ReactTestRenderer | null = null;

afterEach(() => {
  renderer?.unmount();
  renderer = null;
  vi.clearAllMocks();
});

describe("TaskRow", () => {
  it("renders the shared streak badge, check circle, arrow reorder actions, and trash action", () => {
    const onToggle = vi.fn();
    const onDelete = vi.fn();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();

    act(() => {
      renderer = create(
        <TaskRow
          task={task}
          complete={false}
          streak={48}
          onToggle={onToggle}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp
          canMoveDown
        />,
      );
    });

    expect(streakBadge).toHaveBeenCalledWith({ streak: 48 }, undefined);
    expect(renderer!.root.findByProps({ accessibilityLabel: "48 day streak, Diamond tier" })).toBeDefined();
    expect(() => renderer!.root.findByProps({ accessibilityLabel: `Reorder ${task.title}` })).toThrow();
    expect(renderer!.root.findByProps({ accessibilityLabel: `Move ${task.title} up` })).toBeDefined();
    expect(renderer!.root.findByProps({ accessibilityLabel: `Move ${task.title} down` })).toBeDefined();
    expect(renderer!.root.findAll((node) => String(node.type) === "Text").some((node) => node.props.children === "48d")).toBe(false);

    act(() => {
      renderer!.root.findByProps({ accessibilityLabel: task.title }).props.onPress();
      renderer!.root.findByProps({ accessibilityLabel: `Move ${task.title} up` }).props.onPress();
      renderer!.root.findByProps({ accessibilityLabel: `Move ${task.title} down` }).props.onPress();
      renderer!.root.findByProps({ accessibilityLabel: `Delete ${task.title}` }).props.onPress();
    });

    expect(onToggle).toHaveBeenCalledOnce();
    expect(onMoveUp).toHaveBeenCalledOnce();
    expect(onMoveDown).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
