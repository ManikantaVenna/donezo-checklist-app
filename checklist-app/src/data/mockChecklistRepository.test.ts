import { describe, expect, it } from "vitest";
import { MockChecklistRepository } from "./mockChecklistRepository";

describe("MockChecklistRepository task ordering", () => {
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
