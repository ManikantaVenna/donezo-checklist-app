import type { Task } from "./types";
import { sortedCopy } from "./sorting";

export type MoveDirection = "up" | "down";

export type TaskOrderChange = {
  taskId: string;
  sortOrder: number;
  previousSortOrder: number;
};

function isSibling(task: Task, candidate: Task): boolean {
  if (candidate.isArchived) return false;
  if (task.projectId !== null) return candidate.projectId === task.projectId;
  return candidate.projectId === null && candidate.type === task.type;
}

function getSiblings(tasks: Task[], task: Task): Task[] {
  return sortedCopy(
    tasks.filter((candidate) => isSibling(task, candidate)),
    (first, second) => first.sortOrder - second.sortOrder || first.createdAt.localeCompare(second.createdAt),
  );
}

export function planReorderTask(tasks: Task[], taskId: string, targetIndex: number): TaskOrderChange[] | null {
  const task = tasks.find((candidate) => candidate.id === taskId && !candidate.isArchived);
  if (!task) return null;

  const siblings = getSiblings(tasks, task);
  const currentIndex = siblings.findIndex((candidate) => candidate.id === taskId);
  const clampedTargetIndex = Math.max(0, Math.min(targetIndex, siblings.length - 1));

  if (currentIndex < 0 || currentIndex === clampedTargetIndex) {
    return null;
  }

  const reordered = [...siblings];
  const [movedTask] = reordered.splice(currentIndex, 1);
  reordered.splice(clampedTargetIndex, 0, movedTask);

  const changes = reordered
    .map((candidate, index) => ({
      taskId: candidate.id,
      sortOrder: index + 1,
      previousSortOrder: candidate.sortOrder,
    }))
    .filter((change) => change.sortOrder !== change.previousSortOrder)
    .sort((first, second) => {
      if (first.taskId === task.id) return -1;
      if (second.taskId === task.id) return 1;
      return 0;
    });

  return changes.length > 0 ? changes : null;
}

/**
 * Kept for non-UI callers and tests. The new drag UI uses planReorderTask so a
 * row can land anywhere in its own list with one saved reorder.
 */
export function planMoveTask(tasks: Task[], taskId: string, direction: MoveDirection): TaskOrderChange[] | null {
  const task = tasks.find((candidate) => candidate.id === taskId && !candidate.isArchived);
  if (!task) return null;

  const siblings = getSiblings(tasks, task);
  const currentIndex = siblings.findIndex((candidate) => candidate.id === taskId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
    return null;
  }

  return planReorderTask(tasks, taskId, targetIndex);
}
