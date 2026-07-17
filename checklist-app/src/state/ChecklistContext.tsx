import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type { ChecklistSnapshot, Task } from "../domain/types";
import { calculateCurrentStreak, getNextLocalMidnight, isCompletedOnDate, localDateKey } from "../domain/dates";
import { DEFAULT_TIMEZONE } from "../domain/timezones";
import type { ChecklistRepository, CreateProjectInput, CreateTaskInput, MoveDirection } from "../data/checklistRepository";
import { scheduleDailyReminder } from "../lib/reminders";

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
  const pendingTaskIds = useRef(new Set<string>());
  const realtimeRefreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await repository.getSnapshot(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [repository, userId]);

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      if (!input.title.trim()) return;
      try {
        await repository.createTask(userId, input);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to create task.");
        return;
      }
      await refresh();
    },
    [refresh, repository, userId],
  );

  const archiveTask = useCallback(
    async (taskId: string) => {
      try {
        await repository.archiveTask(userId, taskId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to delete task.");
        return;
      }
      await refresh();
    },
    [refresh, repository, userId],
  );

  const moveTask = useCallback(
    async (taskId: string, direction: MoveDirection) => {
      try {
        await repository.moveTask(userId, taskId, direction);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to reorder task.");
        return;
      }
      await refresh();
    },
    [refresh, repository, userId],
  );

  const createProject = useCallback(
    async (input: CreateProjectInput) => {
      if (!input.name.trim()) return;
      try {
        await repository.createProject(userId, input);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to create project.");
        return;
      }
      await refresh();
    },
    [refresh, repository, userId],
  );

  const archiveProject = useCallback(
    async (projectId: string) => {
      try {
        await repository.archiveProject(userId, projectId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to delete project.");
        return;
      }
      await refresh();
    },
    [refresh, repository, userId],
  );

  const updateReminderPreference = useCallback(
    async (enabled: boolean, reminderTime: string) => {
      try {
        await repository.updateReminderPreference(userId, enabled, reminderTime);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update reminder.");
        return;
      }
      await refresh();
    },
    [refresh, repository, userId],
  );

  const updateTimezone = useCallback(
    async (timezone: string) => {
      try {
        await repository.updateTimezone(userId, timezone);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update timezone.");
        return;
      }
      await refresh();
    },
    [refresh, repository, userId],
  );

  const toggleTask = useCallback(
    async (task: Task) => {
      if (!snapshot || pendingTaskIds.current.has(task.id)) return;
      pendingTaskIds.current.add(task.id);

      const localDate = localDateKey(
        new Date(),
        snapshot.timezone ?? DEFAULT_TIMEZONE,
      );
      const previousTask = snapshot.tasks.find((entry) => entry.id === task.id);
      const previousCompletedAt = previousTask ? previousTask.completedAt : task.completedAt;
      const previousDailyCompletions = snapshot.dailyCompletions.filter(
        (entry) => entry.taskId === task.id && entry.localDate === localDate,
      );
      const currentlyComplete =
        task.type === "daily"
          ? isCompletedOnDate(snapshot.dailyCompletions, task.id, localDate)
          : Boolean(task.completedAt);

      setSnapshot((previous) => {
        if (!previous) return previous;

        const hasDailyCompletion = isCompletedOnDate(previous.dailyCompletions, task.id, localDate);
        return {
          ...previous,
          tasks: previous.tasks.map((entry) =>
            entry.id === task.id && entry.type !== "daily"
              ? { ...entry, completedAt: currentlyComplete ? null : new Date().toISOString() }
              : entry,
          ),
          dailyCompletions:
            task.type !== "daily"
              ? previous.dailyCompletions
              : currentlyComplete
                ? previous.dailyCompletions.filter(
                    (entry) => !(entry.taskId === task.id && entry.localDate === localDate),
                  )
                : hasDailyCompletion
                  ? previous.dailyCompletions
                  : [
                      ...previous.dailyCompletions,
                      {
                        id: `${task.id}-${localDate}`,
                        userId,
                        taskId: task.id,
                        localDate,
                        completedAt: new Date().toISOString(),
                      },
                    ],
        };
      });

      try {
        await repository.setTaskComplete(userId, task.id, localDate, !currentlyComplete);
        await refresh();
      } catch (err) {
        setSnapshot((current) => {
          if (!current) return current;

          return {
            ...current,
            tasks:
              task.type === "daily"
                ? current.tasks
                : current.tasks.map((entry) =>
                    entry.id === task.id ? { ...entry, completedAt: previousCompletedAt } : entry,
                  ),
            dailyCompletions:
              task.type !== "daily"
                ? current.dailyCompletions
                : [
                    ...current.dailyCompletions.filter(
                      (entry) => !(entry.taskId === task.id && entry.localDate === localDate),
                    ),
                    ...previousDailyCompletions,
                  ],
          };
        });
        await refresh();
        setError(err instanceof Error ? err.message : "Unable to update task.");
      } finally {
        pendingTaskIds.current.delete(task.id);
      }
    },
    [refresh, repository, snapshot, userId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!repository.subscribeToChanges) return undefined;

    const unsubscribe = repository.subscribeToChanges(userId, () => {
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
