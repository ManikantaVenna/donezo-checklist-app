import type { ReactTestRenderer } from "react-test-renderer";
import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChecklistRepository } from "../data/checklistRepository";
import type { ChecklistSnapshot, Task } from "../domain/types";
import { localDateKey } from "../domain/dates";
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

const TIMEZONE = "America/New_York";

const emptySnapshot: ChecklistSnapshot = {
  tasks: [],
  projects: [],
  dailyCompletions: [],
  reminderPreferences: { userId: "user-1", enabled: false, reminderTime: "23:00" },
  timezone: TIMEZONE,
};

const quickTask: Task = {
  id: "task-1",
  userId: "user-1",
  projectId: null,
  type: "quick",
  title: "Send invoice",
  sortOrder: 1,
  isArchived: false,
  completedAt: null,
  createdAt: "2026-07-17T12:00:00.000Z",
  updatedAt: "2026-07-17T12:00:00.000Z",
};

const taskSnapshot: ChecklistSnapshot = { ...emptySnapshot, tasks: [quickTask] };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function repositoryWith(overrides: Partial<ChecklistRepository> = {}): ChecklistRepository {
  return {
    getSnapshot: vi.fn(async () => emptySnapshot),
    createTask: vi.fn(async () => quickTask),
    renameTask: vi.fn(async () => undefined),
    archiveTask: vi.fn(async () => undefined),
    updateTaskOrders: vi.fn(async () => undefined),
    setTaskComplete: vi.fn(async () => undefined),
    createProject: vi.fn(async () => undefined),
    renameProject: vi.fn(async () => undefined),
    archiveProject: vi.fn(async () => undefined),
    updateReminderPreference: vi.fn(async () => undefined),
    updateTimezone: vi.fn(async () => undefined),
    ...overrides,
  };
}

let renderer: ReactTestRenderer | null = null;

afterEach(() => {
  renderer?.unmount();
  renderer = null;
});

async function renderChecklist(repository: ChecklistRepository) {
  const holder: { value: ChecklistValue | null } = { value: null };

  function Probe() {
    holder.value = useChecklist();
    return null;
  }

  await act(async () => {
    renderer = create(
      <ChecklistProvider repository={repository} userId="user-1">
        <Probe />
      </ChecklistProvider>,
    );
  });

  return holder as { value: ChecklistValue };
}

function findTask(checklist: { value: ChecklistValue }, taskId: string): Task | undefined {
  return checklist.value.snapshot?.tasks.find((task) => task.id === taskId);
}

describe("ChecklistProvider task creation", () => {
  it("shows a task before the network insert finishes and reconciles it without a full reload", async () => {
    const insert = deferred<Task>();
    const repository = repositoryWith({ createTask: () => insert.promise });
    const checklist = await renderChecklist(repository);

    let submit!: Promise<void>;
    act(() => {
      submit = checklist.value.createTask({ title: "Instant task", type: "quick" });
    });

    expect(checklist.value.snapshot?.tasks).toHaveLength(1);
    expect(checklist.value.snapshot?.tasks[0]).toMatchObject({
      title: "Instant task",
      type: "quick",
      sortOrder: 1,
    });
    expect(checklist.value.snapshot?.tasks[0].id).toMatch(/^pending-/);
    expect(repository.getSnapshot).toHaveBeenCalledTimes(1);

    insert.resolve({
      ...checklist.value.snapshot!.tasks[0],
      id: "saved-task-1",
      createdAt: "2026-07-18T15:00:00.000Z",
      updatedAt: "2026-07-18T15:00:00.000Z",
    });
    await act(async () => {
      await submit;
    });

    expect(checklist.value.snapshot?.tasks.map((task) => task.id)).toEqual(["saved-task-1"]);
    expect(repository.getSnapshot).toHaveBeenCalledTimes(1);
  });

  it("removes the optimistic task when the insert fails", async () => {
    const insert = deferred<Task>();
    const repository = repositoryWith({ createTask: () => insert.promise });
    const checklist = await renderChecklist(repository);

    let submit!: Promise<void>;
    act(() => {
      submit = checklist.value.createTask({ title: "Rollback task", type: "daily" });
    });
    expect(checklist.value.snapshot?.tasks).toHaveLength(1);

    insert.reject(new Error("Network unavailable"));
    await act(async () => {
      await submit;
    });

    expect(checklist.value.snapshot?.tasks).toHaveLength(0);
    expect(checklist.value.error).toBe("Network unavailable");
  });

  it("never sends temporary pending ids to the repository", async () => {
    const insert = deferred<Task>();
    const repository = repositoryWith({ createTask: () => insert.promise });
    const checklist = await renderChecklist(repository);

    let submit!: Promise<void>;
    act(() => {
      submit = checklist.value.createTask({ title: "Fresh task", type: "quick" });
    });

    const pendingTask = checklist.value.snapshot!.tasks[0];
    expect(pendingTask.id).toMatch(/^pending-/);

    await act(async () => {
      await checklist.value.toggleTask(pendingTask);
      await checklist.value.archiveTask(pendingTask.id);
      await checklist.value.moveTask(pendingTask.id, "up");
    });

    expect(repository.setTaskComplete).not.toHaveBeenCalled();
    expect(repository.archiveTask).not.toHaveBeenCalled();
    expect(repository.updateTaskOrders).not.toHaveBeenCalled();
    expect(checklist.value.error).toBeNull();

    insert.resolve({
      ...pendingTask,
      id: "saved-task-2",
    });
    await act(async () => {
      await submit;
    });
    expect(checklist.value.snapshot?.tasks.map((task) => task.id)).toEqual(["saved-task-2"]);
  });
});

describe("ChecklistProvider refresh reconciliation", () => {
  it("defers refreshes while a mutation is in flight and reconciles once after it settles", async () => {
    const write = deferred<void>();
    const getSnapshot = vi
      .fn<ChecklistRepository["getSnapshot"]>()
      .mockResolvedValueOnce(taskSnapshot)
      .mockResolvedValue({
        ...taskSnapshot,
        tasks: [{ ...quickTask, completedAt: "2026-07-18T16:00:00.000Z" }],
      });
    const repository = repositoryWith({
      getSnapshot,
      setTaskComplete: vi.fn(() => write.promise),
    });
    const checklist = await renderChecklist(repository);

    let toggle!: Promise<void>;
    act(() => {
      toggle = checklist.value.toggleTask(quickTask);
    });
    expect(findTask(checklist, "task-1")?.completedAt).not.toBeNull();

    // Simulate realtime echoes arriving while the write is still in flight.
    await act(async () => {
      void checklist.value.refresh();
      void checklist.value.refresh();
    });

    expect(getSnapshot).toHaveBeenCalledTimes(1);
    expect(findTask(checklist, "task-1")?.completedAt).not.toBeNull();

    write.resolve();
    await act(async () => {
      await toggle;
    });

    expect(getSnapshot).toHaveBeenCalledTimes(2);
    expect(findTask(checklist, "task-1")?.completedAt).not.toBeNull();
  });

  it("discards a snapshot fetched before a mutation started instead of reverting the UI", async () => {
    const staleFetch = deferred<ChecklistSnapshot>();
    const write = deferred<void>();
    const getSnapshot = vi
      .fn<ChecklistRepository["getSnapshot"]>()
      .mockResolvedValueOnce(taskSnapshot)
      .mockImplementationOnce(() => staleFetch.promise)
      .mockResolvedValue({
        ...taskSnapshot,
        tasks: [{ ...quickTask, completedAt: "2026-07-18T16:00:00.000Z" }],
      });
    const repository = repositoryWith({
      getSnapshot,
      setTaskComplete: vi.fn(() => write.promise),
    });
    const checklist = await renderChecklist(repository);

    let staleRefresh!: Promise<void>;
    act(() => {
      staleRefresh = checklist.value.refresh();
    });

    let toggle!: Promise<void>;
    act(() => {
      toggle = checklist.value.toggleTask(quickTask);
    });
    expect(findTask(checklist, "task-1")?.completedAt).not.toBeNull();

    // The stale snapshot (fetched before the write) resolves mid-mutation.
    staleFetch.resolve(taskSnapshot);
    await act(async () => {
      await staleRefresh;
    });

    expect(findTask(checklist, "task-1")?.completedAt).not.toBeNull();

    write.resolve();
    await act(async () => {
      await toggle;
    });

    expect(findTask(checklist, "task-1")?.completedAt).not.toBeNull();
    expect(getSnapshot).toHaveBeenCalledTimes(3);
  });
});

describe("ChecklistProvider toggle serialization", () => {
  it("passes the already-known task type instead of asking the repository to look it up", async () => {
    const repository = repositoryWith({
      getSnapshot: vi.fn(async () => taskSnapshot),
    });
    const checklist = await renderChecklist(repository);

    await act(async () => {
      await checklist.value.toggleTask(quickTask);
    });

    const localDate = localDateKey(new Date(), TIMEZONE);
    expect(repository.setTaskComplete).toHaveBeenCalledWith("user-1", "task-1", localDate, true, "quick");
  });

  it("serializes rapid toggles so the latest intent wins", async () => {
    const firstWrite = deferred<void>();
    const secondWrite = deferred<void>();
    const setTaskComplete = vi
      .fn<ChecklistRepository["setTaskComplete"]>()
      .mockImplementationOnce(() => firstWrite.promise)
      .mockImplementationOnce(() => secondWrite.promise);
    const repository = repositoryWith({
      getSnapshot: vi.fn(async () => taskSnapshot),
      setTaskComplete,
    });
    const checklist = await renderChecklist(repository);

    let firstToggle!: Promise<void>;
    act(() => {
      firstToggle = checklist.value.toggleTask(quickTask);
    });
    expect(findTask(checklist, "task-1")?.completedAt).not.toBeNull();
    expect(setTaskComplete).toHaveBeenCalledTimes(1);
    expect(setTaskComplete.mock.calls[0]?.[3]).toBe(true);

    // Second tap while the first write is still in flight: UI flips back instantly,
    // but no concurrent network call is issued.
    let secondToggle!: Promise<void>;
    act(() => {
      secondToggle = checklist.value.toggleTask(quickTask);
    });
    expect(findTask(checklist, "task-1")?.completedAt).toBeNull();
    expect(setTaskComplete).toHaveBeenCalledTimes(1);

    firstWrite.resolve();
    await act(async () => {
      await secondToggle;
    });

    expect(setTaskComplete).toHaveBeenCalledTimes(2);
    expect(setTaskComplete.mock.calls[1]?.[3]).toBe(false);

    secondWrite.resolve();
    await act(async () => {
      await firstToggle;
    });

    expect(findTask(checklist, "task-1")?.completedAt).toBeNull();
  });

  it("collapses an even number of rapid toggles into no extra write", async () => {
    const firstWrite = deferred<void>();
    const setTaskComplete = vi
      .fn<ChecklistRepository["setTaskComplete"]>()
      .mockImplementationOnce(() => firstWrite.promise);
    const repository = repositoryWith({
      getSnapshot: vi.fn(async () => taskSnapshot),
      setTaskComplete,
    });
    const checklist = await renderChecklist(repository);

    let firstToggle!: Promise<void>;
    act(() => {
      firstToggle = checklist.value.toggleTask(quickTask);
    });
    act(() => {
      void checklist.value.toggleTask(quickTask);
    });
    act(() => {
      void checklist.value.toggleTask(quickTask);
    });

    // Three taps: desired state ends where the in-flight write already points (complete).
    expect(findTask(checklist, "task-1")?.completedAt).not.toBeNull();

    firstWrite.resolve();
    await act(async () => {
      await firstToggle;
    });

    expect(setTaskComplete).toHaveBeenCalledTimes(1);
    expect(findTask(checklist, "task-1")?.completedAt).not.toBeNull();
  });

  it("gives rapid optimistic adds distinct sort orders", async () => {
    const firstInsert = deferred<Task>();
    const secondInsert = deferred<Task>();
    const createTask = vi
      .fn<ChecklistRepository["createTask"]>()
      .mockImplementationOnce(() => firstInsert.promise)
      .mockImplementationOnce(() => secondInsert.promise);
    const repository = repositoryWith({ createTask });
    const checklist = await renderChecklist(repository);

    let firstSubmit!: Promise<void>;
    let secondSubmit!: Promise<void>;
    act(() => {
      firstSubmit = checklist.value.createTask({ title: "First", type: "quick" });
    });
    act(() => {
      secondSubmit = checklist.value.createTask({ title: "Second", type: "quick" });
    });

    const sortOrders = checklist.value.snapshot!.tasks.map((task) => task.sortOrder);
    expect(sortOrders).toEqual([1, 2]);
    expect(createTask.mock.calls[0]?.[1]?.sortOrder).toBe(1);
    expect(createTask.mock.calls[1]?.[1]?.sortOrder).toBe(2);

    firstInsert.resolve({ ...checklist.value.snapshot!.tasks[0], id: "saved-1" });
    secondInsert.resolve({ ...checklist.value.snapshot!.tasks[1], id: "saved-2" });
    await act(async () => {
      await Promise.all([firstSubmit, secondSubmit]);
    });
  });

  it("re-syncs the checkbox to the last known server state when a write fails", async () => {
    const write = deferred<void>();
    const getSnapshot = vi.fn<ChecklistRepository["getSnapshot"]>().mockResolvedValue(taskSnapshot);
    const repository = repositoryWith({
      getSnapshot,
      setTaskComplete: vi.fn(() => write.promise),
    });
    const checklist = await renderChecklist(repository);

    let toggle!: Promise<void>;
    act(() => {
      toggle = checklist.value.toggleTask(quickTask);
    });
    expect(findTask(checklist, "task-1")?.completedAt).not.toBeNull();

    write.reject(new Error("Network unavailable"));
    await act(async () => {
      await toggle;
    });

    expect(findTask(checklist, "task-1")?.completedAt).toBeNull();
    expect(checklist.value.error).toBe("Network unavailable");
  });
});

describe("ChecklistProvider optimistic archive and reorder", () => {
  it("removes a task immediately and restores it when the archive fails", async () => {
    const archive = deferred<void>();
    const getSnapshot = vi.fn<ChecklistRepository["getSnapshot"]>().mockResolvedValue(taskSnapshot);
    const repository = repositoryWith({
      getSnapshot,
      archiveTask: vi.fn(() => archive.promise),
    });
    const checklist = await renderChecklist(repository);

    let removal!: Promise<void>;
    act(() => {
      removal = checklist.value.archiveTask("task-1");
    });
    expect(findTask(checklist, "task-1")).toBeUndefined();

    archive.reject(new Error("Network unavailable"));
    await act(async () => {
      await removal;
    });

    expect(findTask(checklist, "task-1")).toBeDefined();
    expect(checklist.value.error).toBe("Network unavailable");
  });

  it("removes a task without a follow-up snapshot fetch when the archive succeeds", async () => {
    const getSnapshot = vi.fn<ChecklistRepository["getSnapshot"]>().mockResolvedValue(taskSnapshot);
    const repository = repositoryWith({ getSnapshot });
    const checklist = await renderChecklist(repository);

    await act(async () => {
      await checklist.value.archiveTask("task-1");
    });

    expect(findTask(checklist, "task-1")).toBeUndefined();
    expect(repository.archiveTask).toHaveBeenCalledWith("user-1", "task-1");
    expect(getSnapshot).toHaveBeenCalledTimes(1);
  });

  it("reorders instantly and writes only the two affected rows", async () => {
    const secondTask: Task = {
      ...quickTask,
      id: "task-2",
      title: "Second task",
      sortOrder: 2,
      createdAt: "2026-07-17T13:00:00.000Z",
    };
    const getSnapshot = vi
      .fn<ChecklistRepository["getSnapshot"]>()
      .mockResolvedValue({ ...taskSnapshot, tasks: [quickTask, secondTask] });
    const repository = repositoryWith({ getSnapshot });
    const checklist = await renderChecklist(repository);

    await act(async () => {
      await checklist.value.moveTask("task-2", "up");
    });

    expect(findTask(checklist, "task-2")?.sortOrder).toBe(1);
    expect(findTask(checklist, "task-1")?.sortOrder).toBe(2);
    expect(repository.updateTaskOrders).toHaveBeenCalledWith("user-1", [
      { taskId: "task-2", sortOrder: 1 },
      { taskId: "task-1", sortOrder: 2 },
    ]);
    expect(getSnapshot).toHaveBeenCalledTimes(1);
  });

  it("restores the previous order when the reorder write fails", async () => {
    const write = deferred<void>();
    const secondTask: Task = {
      ...quickTask,
      id: "task-2",
      title: "Second task",
      sortOrder: 2,
      createdAt: "2026-07-17T13:00:00.000Z",
    };
    const getSnapshot = vi
      .fn<ChecklistRepository["getSnapshot"]>()
      .mockResolvedValue({ ...taskSnapshot, tasks: [quickTask, secondTask] });
    const repository = repositoryWith({
      getSnapshot,
      updateTaskOrders: vi.fn(() => write.promise),
    });
    const checklist = await renderChecklist(repository);

    let move!: Promise<void>;
    act(() => {
      move = checklist.value.moveTask("task-2", "up");
    });
    expect(findTask(checklist, "task-2")?.sortOrder).toBe(1);

    write.reject(new Error("Network unavailable"));
    await act(async () => {
      await move;
    });

    expect(findTask(checklist, "task-2")?.sortOrder).toBe(2);
    expect(findTask(checklist, "task-1")?.sortOrder).toBe(1);
    expect(checklist.value.error).toBe("Network unavailable");
  });
});
