import type { Task } from "./types";
import { sortedCopy } from "./sorting";

export type MoveDirection = "up" | "down";

export type TaskOrderChange = {
  taskId: string;
  sortOrder: number;
};

function isSibling(task: Task, candidate: Task): boolean {
  if (candidate.isArchived) return false;
  if (task.projectId !== null) return candidate.projectId === task.projectId;
  return candidate.projectId === null && candidate.type === task.type;
}

/**
 * Plans a one-step reorder as the minimal set of sort-order writes: the moved
 * row and its displaced neighbor, or a single row when both share the same
 * sort order and only a nudge is needed to break the tie.
 */
export function planMoveTask(tasks: Task[], taskId: string, direction: MoveDirection): TaskOrderChange[] | null {
  const task = tasks.find((candidate) => candidate.id === taskId && !candidate.isArchived);
  if (!task) return null;

  const siblings = sortedCopy(
    tasks.filter((candidate) => isSibling(task, candidate)),
    (first, second) => first.sortOrder - second.sortOrder || first.createdAt.localeCompare(second.createdAt),
  );
  const currentIndex = siblings.findIndex((candidate) => candidate.id === taskId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
    return null;
  }

  const neighbor = siblings[targetIndex];

  if (task.sortOrder === neighbor.sortOrder) {
    // Equal sort orders fall back to created-at ordering, so swapping the equal
    // values would change nothing; nudge one row past the tie instead.
    return direction === "up"
      ? [{ taskId: neighbor.id, sortOrder: neighbor.sortOrder + 1 }]
      : [{ taskId: task.id, sortOrder: task.sortOrder + 1 }];
  }

  return [
    { taskId: task.id, sortOrder: neighbor.sortOrder },
    { taskId: neighbor.id, sortOrder: task.sortOrder },
  ];
}
