import { useCallback, useEffect, useRef, useState } from "react";
import type { Task } from "../domain/types";

const UNDO_VISIBLE_MS = 7000;

type UseTaskDeleteUndoInput = {
  archiveTask: (taskId: string) => Promise<void>;
  restoreTask: (task: Task) => Promise<void>;
};

export function useTaskDeleteUndo({ archiveTask, restoreTask }: UseTaskDeleteUndoInput) {
  const [deletedTask, setDeletedTask] = useState<Task | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearUndoTimer = useCallback(() => {
    if (!undoTimer.current) return;

    clearTimeout(undoTimer.current);
    undoTimer.current = null;
  }, []);

  const deleteTask = useCallback(
    (task: Task) => {
      clearUndoTimer();
      setDeletedTask(task);
      void archiveTask(task.id);
      undoTimer.current = setTimeout(() => {
        setDeletedTask((current) => (current?.id === task.id ? null : current));
        undoTimer.current = null;
      }, UNDO_VISIBLE_MS);
    },
    [archiveTask, clearUndoTimer],
  );

  const undoDelete = useCallback(() => {
    if (!deletedTask) return;

    const task = deletedTask;
    clearUndoTimer();
    setDeletedTask(null);
    void restoreTask(task);
  }, [clearUndoTimer, deletedTask, restoreTask]);

  useEffect(() => clearUndoTimer, [clearUndoTimer]);

  return { deletedTask, deleteTask, undoDelete };
}
