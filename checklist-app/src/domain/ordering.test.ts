import { describe, expect, it } from "vitest";
import type { Task } from "./types";
import { planMoveTask } from "./ordering";

function task(overrides: Partial<Task> & Pick<Task, "id" | "sortOrder">): Task {
  return {
    userId: "user-1",
    projectId: null,
    type: "quick",
    title: overrides.id,
    isArchived: false,
    completedAt: null,
    createdAt: "2026-07-17T12:00:00.000Z",
    updatedAt: "2026-07-17T12:00:00.000Z",
    ...overrides,
  };
}

const tasks: Task[] = [
  task({ id: "a", sortOrder: 1 }),
  task({ id: "b", sortOrder: 2 }),
  task({ id: "c", sortOrder: 3 }),
  task({ id: "daily", sortOrder: 1, type: "daily" }),
  task({ id: "p1", sortOrder: 1, type: "project", projectId: "project-a" }),
  task({ id: "p2", sortOrder: 2, type: "project", projectId: "project-a" }),
];

describe("planMoveTask", () => {
  it("swaps only the two affected rows when moving up", () => {
    expect(planMoveTask(tasks, "b", "up")).toEqual([
      { taskId: "b", sortOrder: 1 },
      { taskId: "a", sortOrder: 2 },
    ]);
  });

  it("swaps only the two affected rows when moving down", () => {
    expect(planMoveTask(tasks, "b", "down")).toEqual([
      { taskId: "b", sortOrder: 3 },
      { taskId: "c", sortOrder: 2 },
    ]);
  });

  it("stays inside the task's own list", () => {
    expect(planMoveTask(tasks, "p2", "up")).toEqual([
      { taskId: "p2", sortOrder: 1 },
      { taskId: "p1", sortOrder: 2 },
    ]);
  });

  it("returns null at the list boundaries", () => {
    expect(planMoveTask(tasks, "a", "up")).toBeNull();
    expect(planMoveTask(tasks, "c", "down")).toBeNull();
    expect(planMoveTask(tasks, "daily", "up")).toBeNull();
    expect(planMoveTask(tasks, "daily", "down")).toBeNull();
  });

  it("returns null for unknown or archived tasks", () => {
    expect(planMoveTask(tasks, "missing", "up")).toBeNull();
    expect(planMoveTask([task({ id: "x", sortOrder: 1, isArchived: true })], "x", "up")).toBeNull();
  });

  it("breaks sort-order ties by nudging a single row", () => {
    const tied: Task[] = [
      task({ id: "old", sortOrder: 5, createdAt: "2026-07-16T12:00:00.000Z" }),
      task({ id: "new", sortOrder: 5, createdAt: "2026-07-17T12:00:00.000Z" }),
    ];

    expect(planMoveTask(tied, "new", "up")).toEqual([{ taskId: "old", sortOrder: 6 }]);
    expect(planMoveTask(tied, "old", "down")).toEqual([{ taskId: "old", sortOrder: 6 }]);
  });
});
