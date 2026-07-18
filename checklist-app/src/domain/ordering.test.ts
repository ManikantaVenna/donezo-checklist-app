import { describe, expect, it } from "vitest";
import type { Task } from "./types";
import { planMoveTask, type TaskOrderChange } from "./ordering";

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

function sequenceAfter(tasks: Task[], changes: TaskOrderChange[] | null): string[] {
  const orders = new Map((changes ?? []).map((change) => [change.taskId, change.sortOrder]));
  return tasks
    .map((entry) => ({ ...entry, sortOrder: orders.get(entry.id) ?? entry.sortOrder }))
    .sort((first, second) => first.sortOrder - second.sortOrder || first.createdAt.localeCompare(second.createdAt))
    .map((entry) => entry.id);
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
      { taskId: "b", sortOrder: 1, previousSortOrder: 2 },
      { taskId: "a", sortOrder: 2, previousSortOrder: 1 },
    ]);
  });

  it("swaps only the two affected rows when moving down", () => {
    expect(planMoveTask(tasks, "b", "down")).toEqual([
      { taskId: "b", sortOrder: 3, previousSortOrder: 2 },
      { taskId: "c", sortOrder: 2, previousSortOrder: 3 },
    ]);
  });

  it("stays inside the task's own list", () => {
    expect(planMoveTask(tasks, "p2", "up")).toEqual([
      { taskId: "p2", sortOrder: 1, previousSortOrder: 2 },
      { taskId: "p1", sortOrder: 2, previousSortOrder: 1 },
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

  it("renumbers a two-way tie so the move lands exactly one position away", () => {
    const tied: Task[] = [
      task({ id: "old", sortOrder: 5, createdAt: "2026-07-16T12:00:00.000Z" }),
      task({ id: "new", sortOrder: 5, createdAt: "2026-07-17T12:00:00.000Z" }),
    ];

    expect(sequenceAfter(tied, planMoveTask(tied, "new", "up"))).toEqual(["new", "old"]);
    expect(sequenceAfter(tied, planMoveTask(tied, "old", "down"))).toEqual(["new", "old"]);
  });

  it("moves exactly one position within a three-way tie", () => {
    const tied: Task[] = [
      task({ id: "a", sortOrder: 5, createdAt: "2026-07-16T10:00:00.000Z" }),
      task({ id: "b", sortOrder: 5, createdAt: "2026-07-16T11:00:00.000Z" }),
      task({ id: "c", sortOrder: 5, createdAt: "2026-07-16T12:00:00.000Z" }),
    ];

    expect(sequenceAfter(tied, planMoveTask(tied, "b", "up"))).toEqual(["b", "a", "c"]);
    expect(sequenceAfter(tied, planMoveTask(tied, "b", "down"))).toEqual(["a", "c", "b"]);
    expect(sequenceAfter(tied, planMoveTask(tied, "c", "up"))).toEqual(["a", "c", "b"]);
    expect(sequenceAfter(tied, planMoveTask(tied, "a", "down"))).toEqual(["b", "a", "c"]);
  });

  it("moves exactly one position when four tasks share a sort order", () => {
    const tied: Task[] = [
      task({ id: "a", sortOrder: 5, createdAt: "2026-07-16T10:00:00.000Z" }),
      task({ id: "b", sortOrder: 5, createdAt: "2026-07-16T11:00:00.000Z" }),
      task({ id: "c", sortOrder: 5, createdAt: "2026-07-16T12:00:00.000Z" }),
      task({ id: "d", sortOrder: 5, createdAt: "2026-07-16T13:00:00.000Z" }),
    ];

    expect(sequenceAfter(tied, planMoveTask(tied, "c", "up"))).toEqual(["a", "c", "b", "d"]);
    expect(sequenceAfter(tied, planMoveTask(tied, "b", "down"))).toEqual(["a", "c", "b", "d"]);
    expect(sequenceAfter(tied, planMoveTask(tied, "d", "up"))).toEqual(["a", "b", "d", "c"]);
  });

  it("moves exactly one position when the neighbor is tied with a third task", () => {
    const mixed: Task[] = [
      task({ id: "low", sortOrder: 1, createdAt: "2026-07-16T10:00:00.000Z" }),
      task({ id: "tied-old", sortOrder: 5, createdAt: "2026-07-16T11:00:00.000Z" }),
      task({ id: "tied-new", sortOrder: 5, createdAt: "2026-07-16T12:00:00.000Z" }),
    ];

    expect(sequenceAfter(mixed, planMoveTask(mixed, "tied-old", "up"))).toEqual(["tied-old", "low", "tied-new"]);
    expect(sequenceAfter(mixed, planMoveTask(mixed, "low", "down"))).toEqual(["tied-old", "low", "tied-new"]);
  });
});
