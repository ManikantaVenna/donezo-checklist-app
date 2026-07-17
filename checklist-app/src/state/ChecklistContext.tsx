import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
      await repository.createTask(userId, input);
      await refresh();
    },
    [refresh, repository, userId],
  );

  const toggleTask = useCallback(
    async (task: Task) => {
      if (!snapshot) return;
      const currentlyComplete =
        task.type === "daily"
          ? isCompletedOnDate(snapshot.dailyCompletions, task.id, todayLocalDate)
          : Boolean(task.completedAt);

      setSnapshot({
        ...snapshot,
        tasks: snapshot.tasks.map((entry) =>
          entry.id === task.id && entry.type !== "daily"
            ? { ...entry, completedAt: currentlyComplete ? null : new Date().toISOString() }
            : entry,
        ),
        dailyCompletions:
          task.type === "daily" && !currentlyComplete
            ? [
                ...snapshot.dailyCompletions,
                {
                  id: `${task.id}-${todayLocalDate}`,
                  userId,
                  taskId: task.id,
                  localDate: todayLocalDate,
                  completedAt: new Date().toISOString(),
                },
              ]
            : snapshot.dailyCompletions.filter(
                (entry) => !(entry.taskId === task.id && entry.localDate === todayLocalDate),
              ),
      });

      try {
        await repository.setTaskComplete(userId, task.id, todayLocalDate, !currentlyComplete);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update task.");
        await refresh();
      }
    },
    [refresh, repository, snapshot, todayLocalDate, userId],
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
