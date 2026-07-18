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

  it("moves tasks up and down within their own list", async () => {
    const repository = new MockChecklistRepository();
    const userId = "demo-user";

    await repository.createTask(userId, { title: "First quick task", type: "quick" });
    await repository.createTask(userId, { title: "Second quick task", type: "quick" });

    let snapshot = await repository.getSnapshot(userId);
    const quickTasks = snapshot.tasks.filter((task) => task.type === "quick");
    const first = quickTasks.find((task) => task.title === "First quick task");
    const second = quickTasks.find((task) => task.title === "Second quick task");

    expect(first).toBeDefined();
    expect(second).toBeDefined();

    await repository.moveTask(userId, second!.id, "up");

    snapshot = await repository.getSnapshot(userId);
    expect(snapshot.tasks.filter((task) => task.type === "quick").map((task) => task.title)).toEqual([
      "Send invoice",
      "Second quick task",
      "First quick task",
    ]);

    await repository.moveTask(userId, second!.id, "down");

    snapshot = await repository.getSnapshot(userId);
    expect(snapshot.tasks.filter((task) => task.type === "quick").map((task) => task.title)).toEqual([
      "Send invoice",
      "First quick task",
      "Second quick task",
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
