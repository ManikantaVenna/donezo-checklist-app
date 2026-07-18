import { describe, expect, it } from "vitest";
import type { ChecklistSnapshot, Task } from "../domain/types";
import { createOptimisticTask, createPendingTaskId, isPendingTaskId } from "./optimisticTask";

const baseTask: Task = {
  id: "quick-1",
  userId: "user-1",
  projectId: null,
  type: "quick",
  title: "Existing task",
  sortOrder: 4,
  isArchived: false,
  completedAt: null,
  createdAt: "2026-07-18T12:00:00.000Z",
  updatedAt: "2026-07-18T12:00:00.000Z",
};

const snapshot: ChecklistSnapshot = {
  tasks: [
    baseTask,
    { ...baseTask, id: "daily-1", type: "daily", sortOrder: 8 },
    { ...baseTask, id: "project-1", type: "project", projectId: "project-a", sortOrder: 3 },
  ],
  projects: [],
  dailyCompletions: [],
  reminderPreferences: { userId: "user-1", enabled: false, reminderTime: "23:00" },
  timezone: "America/New_York",
};

describe("createOptimisticTask", () => {
  it("places a quick task after its quick-task siblings", () => {
    const task = createOptimisticTask(
      snapshot,
      "user-1",
      { title: "  New quick task  ", type: "quick" },
      "pending-1",
      "2026-07-18T13:00:00.000Z",
    );

    expect(task).toMatchObject({
      id: "pending-1",
      title: "New quick task",
      type: "quick",
      projectId: null,
      sortOrder: 5,
    });
  });

  it("calculates project ordering independently", () => {
    const task = createOptimisticTask(
      snapshot,
      "user-1",
      { title: "Project work", type: "project", projectId: "project-a" },
      "pending-2",
      "2026-07-18T13:00:00.000Z",
    );

    expect(task.sortOrder).toBe(4);
    expect(task.projectId).toBe("project-a");
  });

  it("accepts an explicit sort order for adds racing an unsettled insert", () => {
    const task = createOptimisticTask(
      snapshot,
      "user-1",
      { title: "Racing add", type: "quick" },
      "pending-3",
      "2026-07-18T13:00:00.000Z",
      6,
    );

    expect(task.sortOrder).toBe(6);
  });
});

describe("pending task ids", () => {
  it("recognizes ids produced by createPendingTaskId", () => {
    expect(isPendingTaskId(createPendingTaskId(7))).toBe(true);
  });

  it("does not flag persisted uuids", () => {
    expect(isPendingTaskId("0b0f5cbe-14b8-4f81-9df5-16ad0f1b3c5d")).toBe(false);
  });
});
