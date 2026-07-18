import type { ReactTestRenderer } from "react-test-renderer";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CreateTaskInput } from "../data/checklistRepository";
import { TaskComposer } from "./TaskComposer";

vi.mock("react-native", () => {
  const { createElement } = require("react") as typeof import("react");
  const host =
    (name: string) =>
    ({ children, ...props }: { children?: unknown }) =>
      createElement(name, props, children as never);

  return {
    View: host("View"),
    Text: host("Text"),
    TextInput: host("TextInput"),
    Pressable: host("Pressable"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  };
});

let renderer: ReactTestRenderer | null = null;

afterEach(() => {
  renderer?.unmount();
  renderer = null;
});

function renderComposer(onSubmit: (input: CreateTaskInput) => Promise<void>) {
  act(() => {
    renderer = create(
      <TaskComposer defaultType="quick" label="ADD TASK" onSubmit={onSubmit} placeholder="Add something..." />,
    );
  });

  const input = renderer!.root.findAll((node) => String(node.type) === "TextInput")[0];
  return { input };
}

describe("TaskComposer", () => {
  it("clears the input immediately and does not block further adds on the network", async () => {
    const pending: Array<() => void> = [];
    const onSubmit = vi.fn(
      (_input: CreateTaskInput) =>
        new Promise<void>((resolve) => {
          pending.push(resolve);
        }),
    );
    const { input } = renderComposer(onSubmit);

    act(() => {
      input.props.onChangeText("First task");
    });
    act(() => {
      input.props.onSubmitEditing();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ title: "First task", type: "quick", projectId: null });
    expect(input.props.value).toBe("");

    // A second task can be composed and submitted while the first insert is
    // still in flight.
    act(() => {
      input.props.onChangeText("Second task");
    });
    act(() => {
      input.props.onSubmitEditing();
    });

    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit).toHaveBeenLastCalledWith({ title: "Second task", type: "quick", projectId: null });

    await act(async () => {
      pending.forEach((resolve) => resolve());
    });
  });

  it("ignores submissions with only whitespace", () => {
    const onSubmit = vi.fn(async () => undefined);
    const { input } = renderComposer(onSubmit);

    act(() => {
      input.props.onChangeText("   ");
    });
    act(() => {
      input.props.onSubmitEditing();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
