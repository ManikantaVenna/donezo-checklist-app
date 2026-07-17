import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ChecklistSnapshot, Task } from "../domain/types";
import { calculateCurrentStreak, isCompletedOnDate, localDateKey } from "../domain/dates";
import type { ChecklistRepository, CreateTaskInput } from "../data/checklistRepository";

type ChecklistContextValue = {
  snapshot: ChecklistSnapshot | null;
  todayLocalDate: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<void>;
  toggleTask: (task: Task) => Promise<void>;
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
  const pendingTaskIds = useRef(new Set<string>());

  const todayLocalDate = useMemo(() => {
    const timezone = snapshot?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    return localDateKey(new Date(), timezone);
  }, [snapshot?.timezone]);

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

  const toggleTask = useCallback(
    async (task: Task) => {
      if (!snapshot || pendingTaskIds.current.has(task.id)) return;
      pendingTaskIds.current.add(task.id);

      const previousSnapshot = snapshot;
      const localDate = localDateKey(
        new Date(),
        snapshot.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
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
        setSnapshot(previousSnapshot);
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

  const value = useMemo(
    () => ({ snapshot, todayLocalDate, loading, error, refresh, createTask, toggleTask }),
    [createTask, error, loading, refresh, snapshot, todayLocalDate, toggleTask],
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
