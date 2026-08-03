import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type { ChecklistSnapshot, Task, WebPushSubscriptionInput } from "../domain/types";
import { calculateCurrentStreak, getNextLocalMidnight, isCompletedOnDate, localDateKey } from "../domain/dates";
import { DEFAULT_TIMEZONE } from "../domain/timezones";
import type { ChecklistRepository, CreateProjectInput, CreateTaskInput, MoveDirection } from "../data/checklistRepository";
import { planMoveTask } from "../domain/ordering";
import { scheduleDailyReminder } from "../lib/reminders";
import { createOptimisticTask, createPendingTaskId, isPendingTaskId, nextTaskSortOrder } from "./optimisticTask";

type ChecklistContextValue = {
  snapshot: ChecklistSnapshot | null;
  todayLocalDate: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<void>;
  archiveTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, direction: MoveDirection) => Promise<void>;
  toggleTask: (task: Task) => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<void>;
  archiveProject: (projectId: string) => Promise<void>;
  updateReminderPreference: (enabled: boolean, reminderTime: string) => Promise<void>;
  updateTimezone: (timezone: string) => Promise<void>;
  saveWebPushSubscription: (subscription: WebPushSubscriptionInput) => Promise<void>;
  deleteWebPushSubscription: (endpoint: string) => Promise<void>;
};

const ChecklistContext = createContext<ChecklistContextValue | null>(null);

export function ChecklistProvider({
  children,
  repository,
  userId,
}: PropsWithChildren<{ repository: ChecklistRepository; userId: string }>) {
  const [snapshot, setSnapshot] = useState<ChecklistSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayLocalDate, setTodayLocalDate] = useState(() =>
    localDateKey(new Date(), DEFAULT_TIMEZONE),
  );
  const toggleRuns = useRef(new Map<string, { desired: boolean; localDate: string }>());
  const pendingCreateSequence = useRef(0);
  const pendingInserts = useRef(new Map<string, { count: number; highestSortOrder: number }>());
  const hasLoadedSnapshot = useRef(false);
  const refreshPromise = useRef<Promise<void> | null>(null);
  const refreshQueued = useRef(false);
  const realtimeRefreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMutations = useRef(0);
  // Bumped when any mutation begins or settles. A snapshot fetched under one
  // revision must not be applied under another: the fetch may have read the
  // database before a write that has since happened committed.
  const mutationRevision = useRef(0);
  const refreshQueuedAfterMutations = useRef(false);

  const runRefresh = useCallback(async () => {
    if (refreshPromise.current) {
      refreshQueued.current = true;
      await refreshPromise.current;
      return;
    }

    do {
      refreshQueued.current = false;
      if (pendingMutations.current > 0) {
        refreshQueuedAfterMutations.current = true;
        return;
      }

      const initialLoad = !hasLoadedSnapshot.current;
      const operation = (async () => {
        if (initialLoad) setLoading(true);
        setError(null);
        const revisionAtFetchStart = mutationRevision.current;
        try {
          const nextSnapshot = await repository.getSnapshot(userId);
          if (pendingMutations.current > 0) {
            // A write is still in flight; reconcile once it settles.
            refreshQueuedAfterMutations.current = true;
            return;
          }
          if (mutationRevision.current !== revisionAtFetchStart) {
            // A mutation began (and possibly fully settled) while this fetch was
            // in flight, so the data may predate that write. Discard it and loop
            // around for one fresh reconciliation.
            refreshQueued.current = true;
            return;
          }
          hasLoadedSnapshot.current = true;
          setSnapshot(nextSnapshot);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unable to load tasks.");
        } finally {
          if (initialLoad) setLoading(false);
        }
      })();

      refreshPromise.current = operation;
      await operation;
      refreshPromise.current = null;
    } while (refreshQueued.current);
  }, [repository, userId]);

  const refresh = useCallback(async () => {
    if (pendingMutations.current > 0) {
      refreshQueuedAfterMutations.current = true;
      return;
    }

    await runRefresh();
  }, [runRefresh]);

  const beginMutation = useCallback(() => {
    pendingMutations.current += 1;
    mutationRevision.current += 1;
  }, []);

  const endMutation = useCallback(() => {
    pendingMutations.current -= 1;
    mutationRevision.current += 1;
    if (pendingMutations.current === 0 && refreshQueuedAfterMutations.current) {
      refreshQueuedAfterMutations.current = false;
      void runRefresh();
    }
  }, [runRefresh]);

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      if (!input.title.trim() || !snapshot) return;

      const optimisticId = createPendingTaskId(++pendingCreateSequence.current);
      // Reserve a sort order above any insert that is still in flight, so rapid
      // adds never collide even when this callback closed over a stale snapshot.
      const groupKey = input.type === "project" ? `project:${input.projectId ?? ""}` : `list:${input.type}`;
      const insertGroup = pendingInserts.current.get(groupKey);
      const sortOrder = Math.max(
        nextTaskSortOrder(snapshot, input),
        insertGroup ? insertGroup.highestSortOrder + 1 : 0,
      );
      pendingInserts.current.set(groupKey, {
        count: (insertGroup?.count ?? 0) + 1,
        highestSortOrder: sortOrder,
      });
      const optimisticTask = createOptimisticTask(
        snapshot,
        userId,
        input,
        optimisticId,
        new Date().toISOString(),
        sortOrder,
      );
      setError(null);
      setSnapshot((previous) =>
        previous ? { ...previous, tasks: [...previous.tasks, optimisticTask] } : previous,
      );

      beginMutation();
      try {
        const createdTask = await repository.createTask(userId, {
          ...input,
          sortOrder: optimisticTask.sortOrder,
        });
        setSnapshot((previous) =>
          previous
            ? {
                ...previous,
                tasks: previous.tasks.map((task) =>
                  task.id === optimisticId ? createdTask : task,
                ),
              }
            : previous,
        );
      } catch (err) {
        setSnapshot((previous) =>
          previous
            ? {
                ...previous,
                tasks: previous.tasks.filter((task) => task.id !== optimisticId),
              }
            : previous,
        );
        setError(err instanceof Error ? err.message : "Unable to create task.");
      } finally {
        const group = pendingInserts.current.get(groupKey);
        if (group) {
          if (group.count <= 1) {
            pendingInserts.current.delete(groupKey);
          } else {
            group.count -= 1;
          }
        }
        endMutation();
      }
    },
    [beginMutation, endMutation, repository, snapshot, userId],
  );

  const archiveTask = useCallback(
    async (taskId: string) => {
      if (isPendingTaskId(taskId) || !snapshot) return;

      const archivedTask = snapshot.tasks.find((task) => task.id === taskId);
      if (!archivedTask) return;

      setSnapshot((previous) =>
        previous ? { ...previous, tasks: previous.tasks.filter((task) => task.id !== taskId) } : previous,
      );

      beginMutation();
      try {
        await repository.archiveTask(userId, taskId);
        endMutation();
      } catch (err) {
        setSnapshot((previous) =>
          previous ? { ...previous, tasks: [...previous.tasks, archivedTask] } : previous,
        );
        refreshQueuedAfterMutations.current = true;
        endMutation();
        setError(err instanceof Error ? err.message : "Unable to delete task.");
      }
    },
    [beginMutation, endMutation, repository, snapshot, userId],
  );

  const moveTask = useCallback(
    async (taskId: string, direction: MoveDirection) => {
      if (isPendingTaskId(taskId) || !snapshot) return;

      const changes = planMoveTask(snapshot.tasks, taskId, direction);
      if (!changes) return;

      const nextOrders = new Map(changes.map((change) => [change.taskId, change.sortOrder]));
      const previousOrders = new Map(
        snapshot.tasks.filter((task) => nextOrders.has(task.id)).map((task) => [task.id, task.sortOrder]),
      );
      const applyOrders = (orders: Map<string, number>) => {
        setSnapshot((previous) =>
          previous
            ? {
                ...previous,
                tasks: previous.tasks.map((task) => {
                  const sortOrder = orders.get(task.id);
                  return sortOrder === undefined ? task : { ...task, sortOrder };
                }),
              }
            : previous,
        );
      };

      applyOrders(nextOrders);

      beginMutation();
      try {
        await repository.updateTaskOrders(userId, changes);
        endMutation();
      } catch (err) {
        applyOrders(previousOrders);
        refreshQueuedAfterMutations.current = true;
        endMutation();
        setError(err instanceof Error ? err.message : "Unable to reorder task.");
      }
    },
    [beginMutation, endMutation, repository, snapshot, userId],
  );

  const createProject = useCallback(
    async (input: CreateProjectInput) => {
      if (!input.name.trim()) return;

      beginMutation();
      try {
        await repository.createProject(userId, input);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to create project.");
        return;
      } finally {
        endMutation();
      }
      await refresh();
    },
    [beginMutation, endMutation, refresh, repository, userId],
  );

  const archiveProject = useCallback(
    async (projectId: string) => {
      beginMutation();
      try {
        await repository.archiveProject(userId, projectId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to delete project.");
        return;
      } finally {
        endMutation();
      }
      await refresh();
    },
    [beginMutation, endMutation, refresh, repository, userId],
  );

  const updateReminderPreference = useCallback(
    async (enabled: boolean, reminderTime: string) => {
      beginMutation();
      try {
        await repository.updateReminderPreference(userId, enabled, reminderTime);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update reminder.");
        return;
      } finally {
        endMutation();
      }
      await refresh();
    },
    [beginMutation, endMutation, refresh, repository, userId],
  );

  const updateTimezone = useCallback(
    async (timezone: string) => {
      beginMutation();
      try {
        await repository.updateTimezone(userId, timezone);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update timezone.");
        return;
      } finally {
        endMutation();
      }
      await refresh();
    },
    [beginMutation, endMutation, refresh, repository, userId],
  );

  const saveWebPushSubscription = useCallback(
    async (subscription: WebPushSubscriptionInput) => {
      if (!repository.saveWebPushSubscription) {
        throw new Error("Web reminders are unavailable.");
      }

      try {
        await repository.saveWebPushSubscription(userId, subscription);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save web reminder subscription.");
        throw err;
      }
    },
    [repository, userId],
  );

  const deleteWebPushSubscription = useCallback(
    async (endpoint: string) => {
      if (!repository.deleteWebPushSubscription) {
        throw new Error("Web reminders are unavailable.");
      }

      try {
        await repository.deleteWebPushSubscription(userId, endpoint);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to remove web reminder subscription.");
        throw err;
      }
    },
    [repository, userId],
  );

  const applyTaskCompletion = useCallback(
    (task: Task, complete: boolean, localDate: string, completedAtIso: string) => {
      setSnapshot((previous) => {
        if (!previous) return previous;

        if (task.type !== "daily") {
          return {
            ...previous,
            tasks: previous.tasks.map((entry) =>
              entry.id === task.id ? { ...entry, completedAt: complete ? completedAtIso : null } : entry,
            ),
          };
        }

        const hasCompletion = isCompletedOnDate(previous.dailyCompletions, task.id, localDate);
        if (complete === hasCompletion) return previous;

        return {
          ...previous,
          dailyCompletions: complete
            ? [
                ...previous.dailyCompletions,
                {
                  id: `${task.id}-${localDate}`,
                  userId,
                  taskId: task.id,
                  localDate,
                  completedAt: completedAtIso,
                },
              ]
            : previous.dailyCompletions.filter(
                (entry) => !(entry.taskId === task.id && entry.localDate === localDate),
              ),
        };
      });
    },
    [userId],
  );

  const toggleTask = useCallback(
    async (task: Task) => {
      if (!snapshot || isPendingTaskId(task.id)) return;

      const localDate = localDateKey(new Date(), snapshot.timezone ?? DEFAULT_TIMEZONE);
      const activeRun = toggleRuns.current.get(task.id);
      const currentlyComplete = activeRun
        ? activeRun.desired
        : task.type === "daily"
          ? isCompletedOnDate(snapshot.dailyCompletions, task.id, localDate)
          : Boolean(snapshot.tasks.find((entry) => entry.id === task.id)?.completedAt ?? task.completedAt);
      const desired = !currentlyComplete;

      applyTaskCompletion(task, desired, localDate, new Date().toISOString());

      // A write for this task is already in flight: record the latest intent and
      // let the running loop send it once the current request settles.
      if (activeRun) {
        activeRun.desired = desired;
        activeRun.localDate = localDate;
        return;
      }

      const run = { desired, localDate };
      toggleRuns.current.set(task.id, run);
      let serverComplete = currentlyComplete;

      beginMutation();
      try {
        while (serverComplete !== run.desired) {
          const target = run.desired;
          const targetDate = run.localDate;
          await repository.setTaskComplete(userId, task.id, targetDate, target, task.type);
          serverComplete = target;
        }
        toggleRuns.current.delete(task.id);
        endMutation();
      } catch (err) {
        toggleRuns.current.delete(task.id);
        applyTaskCompletion(task, serverComplete, run.localDate, new Date().toISOString());
        refreshQueuedAfterMutations.current = true;
        endMutation();
        setError(err instanceof Error ? err.message : "Unable to update task.");
      }
    },
    [applyTaskCompletion, beginMutation, endMutation, repository, snapshot, userId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!repository.subscribeToChanges) return undefined;

    const unsubscribe = repository.subscribeToChanges(userId, () => {
      // Every join (initial or rejoin) schedules one debounced refresh: writes
      // from other devices can land between a snapshot's server-side read and
      // the channel join, and the client cannot observe that ordering. The
      // refresh is non-blocking and coalesces with any fetch already in flight.
      if (realtimeRefreshTimeout.current) {
        clearTimeout(realtimeRefreshTimeout.current);
      }

      realtimeRefreshTimeout.current = setTimeout(() => {
        realtimeRefreshTimeout.current = null;
        void refresh();
      }, 250);
    });

    return () => {
      if (realtimeRefreshTimeout.current) {
        clearTimeout(realtimeRefreshTimeout.current);
        realtimeRefreshTimeout.current = null;
      }
      unsubscribe();
    };
  }, [refresh, repository, userId]);

  useEffect(() => {
    const timezone = snapshot?.timezone ?? DEFAULT_TIMEZONE;
    setTodayLocalDate(localDateKey(new Date(), timezone));
  }, [snapshot?.timezone]);

  const unfinishedDailyCount = useMemo(() => {
    if (!snapshot) return 0;

    return snapshot.tasks.filter(
      (task) => task.type === "daily" && !isCompletedOnDate(snapshot.dailyCompletions, task.id, todayLocalDate),
    ).length;
  }, [snapshot?.dailyCompletions, snapshot?.tasks, todayLocalDate]);

  const reminderEnabled = snapshot?.reminderPreferences.enabled ?? false;
  const reminderTime = snapshot?.reminderPreferences.reminderTime ?? "";
  const reminderTimezone = snapshot?.timezone ?? DEFAULT_TIMEZONE;
  const hasSnapshot = snapshot !== null;

  useEffect(() => {
    const refreshAfterLocalDateChange = () => {
      const timezone = snapshot?.timezone ?? DEFAULT_TIMEZONE;
      const nextLocalDate = localDateKey(new Date(), timezone);
      if (nextLocalDate !== todayLocalDate) {
        setTodayLocalDate(nextLocalDate);
        void refresh();
      }
    };

    const timezone = snapshot?.timezone ?? DEFAULT_TIMEZONE;
    const now = new Date();
    const nextReset = getNextLocalMidnight(now, timezone);
    const resetDelay = Math.max(1_000, nextReset.getTime() - now.getTime() + 1_000);
    const timeout = setTimeout(refreshAfterLocalDateChange, Math.min(resetDelay, 2_147_483_647));

    return () => clearTimeout(timeout);
  }, [refresh, snapshot?.timezone, todayLocalDate]);

  useEffect(() => {
    if (!hasSnapshot) return;

    void scheduleDailyReminder(unfinishedDailyCount, reminderEnabled, reminderTime, reminderTimezone).catch((err) => {
      console.warn("Unable to schedule daily reminder.", err);
    });
  }, [hasSnapshot, reminderEnabled, reminderTime, reminderTimezone, todayLocalDate, unfinishedDailyCount]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        const timezone = snapshot?.timezone ?? DEFAULT_TIMEZONE;
        setTodayLocalDate(localDateKey(new Date(), timezone));
        void refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh, snapshot?.timezone]);

  const value = useMemo(
    () => ({
      snapshot,
      todayLocalDate,
      loading,
      error,
      refresh,
      createTask,
      archiveTask,
      moveTask,
      toggleTask,
      createProject,
      archiveProject,
      updateReminderPreference,
      updateTimezone,
      saveWebPushSubscription,
      deleteWebPushSubscription,
    }),
    [
      archiveProject,
      archiveTask,
      createProject,
      createTask,
      error,
      loading,
      moveTask,
      refresh,
      snapshot,
      todayLocalDate,
      toggleTask,
      saveWebPushSubscription,
      deleteWebPushSubscription,
      updateReminderPreference,
      updateTimezone,
    ],
  );

  return <ChecklistContext.Provider value={value}>{children}</ChecklistContext.Provider>;
}

export function useChecklist() {
  const value = useContext(ChecklistContext);
  if (!value) throw new Error("useChecklist must be used inside ChecklistProvider.");
  return value;
}

export function getDailyStreak(snapshot: ChecklistSnapshot, taskId: string, todayLocalDate: string): number {
  return calculateCurrentStreak(snapshot.dailyCompletions, taskId, todayLocalDate);
}
