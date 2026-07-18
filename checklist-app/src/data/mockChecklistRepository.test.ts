import { describe, expect, it } from "vitest";
import { MockChecklistRepository } from "./mockChecklistRepository";

describe("MockChecklistRepository task ordering", () => {
  it("returns the created task and accepts a locally calculated sort order", async () => {
    const repository = new MockChecklistRepository();

    const task = await repository.createTask("demo-user", {
      title: "Fast task",
      type: "quick",
      sortOrder: 12,
    });

    expect(task).toMatchObject({ title: "Fast task", type: "quick", sortOrder: 12 });
  });

  it("applies bulk sort-order updates for the swapped rows", async () => {
    const repository = new MockChecklistRepository();
    const userId = "demo-user";

    await repository.updateTaskOrders(userId, [
      { taskId: "daily-1", sortOrder: 2, previousSortOrder: 1 },
      { taskId: "daily-2", sortOrder: 1, previousSortOrder: 2 },
    ]);

    const snapshot = await repository.getSnapshot(userId);
    expect(snapshot.tasks.filter((task) => task.type === "daily").map((task) => task.id)).toEqual([
      "daily-2",
      "daily-1",
    ]);
  });
});

describe("MockChecklistRepository project deletion", () => {
  it("archives a project and hides its project tasks", async () => {
    const repository = new MockChecklistRepository();
    const userId = "demo-user";

    await repository.archiveProject(userId, "project-1");

    const snapshot = await repository.getSnapshot(userId);
    expect(snapshot.projects.map((project) => project.id)).not.toContain("project-1");
    expect(snapshot.tasks.map((task) => task.projectId)).not.toContain("project-1");
  });
});

describe("MockChecklistRepository settings", () => {
  it("defaults to New York timezone with an 11 PM reminder", async () => {
    const repository = new MockChecklistRepository();

    const snapshot = await repository.getSnapshot("new-user");

    expect(snapshot.timezone).toBe("America/New_York");
    expect(snapshot.reminderPreferences).toMatchObject({
      enabled: true,
      reminderTime: "23:00",
    });
  });

  it("updates timezone and daily reminder preferences", async () => {
    const repository = new MockChecklistRepository();
    const userId = "demo-user";

    await repository.updateTimezone(userId, "Asia/Kolkata");
    await repository.updateReminderPreference(userId, false, "22:30");

    const snapshot = await repository.getSnapshot(userId);
    expect(snapshot.timezone).toBe("Asia/Kolkata");
    expect(snapshot.reminderPreferences).toMatchObject({
      enabled: false,
      reminderTime: "22:30",
    });
  });
});
