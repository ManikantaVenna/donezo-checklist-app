import type { ReactTestRenderer } from "react-test-renderer";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChecklistRepository } from "../data/checklistRepository";
import type { ChecklistSnapshot, Task } from "../domain/types";
import { ChecklistProvider, useChecklist } from "./ChecklistContext";

vi.mock("react-native", () => ({
  AppState: {
    addEventListener: () => ({ remove: () => undefined }),
  },
}));

vi.mock("../lib/reminders", () => ({
  scheduleDailyReminder: vi.fn(async () => undefined),
}));

type ChecklistValue = ReturnType<typeof useChecklist>;

const emptySnapshot: ChecklistSnapshot = {
  tasks: [],
  projects: [],
  dailyCompletions: [],
  reminderPreferences: { userId: "user-1", enabled: false, reminderTime: "23:00" },
  timezone: "America/New_York",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function repositoryWith(createTask: ChecklistRepository["createTask"]): ChecklistRepository {
  return {
    getSnapshot: vi.fn(async () => emptySnapshot),
    createTask,
    renameTask: vi.fn(async () => undefined),
    archiveTask: vi.fn(async () => undefined),
    moveTask: vi.fn(async () => undefined),
    setTaskComplete: vi.fn(async () => undefined),
    createProject: vi.fn(async () => undefined),
    renameProject: vi.fn(async () => undefined),
    archiveProject: vi.fn(async () => undefined),
    updateReminderPreference: vi.fn(async () => undefined),
    updateTimezone: vi.fn(async () => undefined),
  };
}

let renderer: ReactTestRenderer | null = null;

afterEach(() => {
  renderer?.unmount();
  renderer = null;
});

describe("ChecklistProvider task creation", () => {
  it("shows a task before the network insert finishes and reconciles it without a full reload", async () => {
    const insert = deferred<Task>();
    const repository = repositoryWith(() => insert.promise);
    let checklist: ChecklistValue | null = null;

    function Probe() {
      checklist = useChecklist();
      return null;
    }

    await act(async () => {
      renderer = create(
        <ChecklistProvider repository={repository} userId="user-1">
          <Probe />
        </ChecklistProvider>,
      );
    });

    let submit!: Promise<void>;
    act(() => {
      submit = checklist!.createTask({ title: "Instant task", type: "quick" });
    });

    expect(checklist!.snapshot?.tasks).toHaveLength(1);
    expect(checklist!.snapshot?.tasks[0]).toMatchObject({
      title: "Instant task",
      type: "quick",
      sortOrder: 1,
    });
    expect(checklist!.snapshot?.tasks[0].id).toMatch(/^pending-/);
    expect(repository.getSnapshot).toHaveBeenCalledTimes(1);

    insert.resolve({
      ...checklist!.snapshot!.tasks[0],
      id: "saved-task-1",
      createdAt: "2026-07-18T15:00:00.000Z",
      updatedAt: "2026-07-18T15:00:00.000Z",
    });
    await act(async () => {
      await submit;
    });

    expect(checklist!.snapshot?.tasks.map((task) => task.id)).toEqual(["saved-task-1"]);
    expect(repository.getSnapshot).toHaveBeenCalledTimes(1);
  });

  it("removes the optimistic task when the insert fails", async () => {
    const insert = deferred<Task>();
    const repository = repositoryWith(() => insert.promise);
    let checklist: ChecklistValue | null = null;

    function Probe() {
      checklist = useChecklist();
      return null;
    }

    await act(async () => {
      renderer = create(
        <ChecklistProvider repository={repository} userId="user-1">
          <Probe />
        </ChecklistProvider>,
      );
    });

    let submit!: Promise<void>;
    act(() => {
      submit = checklist!.createTask({ title: "Rollback task", type: "daily" });
    });
    expect(checklist!.snapshot?.tasks).toHaveLength(1);

    insert.reject(new Error("Network unavailable"));
    await act(async () => {
      await submit;
    });

    expect(checklist!.snapshot?.tasks).toHaveLength(0);
    expect(checklist!.error).toBe("Network unavailable");
  });
});
