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

/**
 * Plans a one-step reorder as the minimal set of sort-order writes: the moved
 * row and its displaced neighbor when all sibling sort orders are distinct.
 * When any siblings share a sort order (a legacy state left by earlier rapid
 * adds), the tie-break by created_at makes value swaps unreliable, so the whole
 * group is renumbered to make every position explicit.
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
  const hasDuplicateOrders = new Set(siblings.map((candidate) => candidate.sortOrder)).size !== siblings.length;

  if (!hasDuplicateOrders) {
    return [
      { taskId: task.id, sortOrder: neighbor.sortOrder, previousSortOrder: task.sortOrder },
      { taskId: neighbor.id, sortOrder: task.sortOrder, previousSortOrder: neighbor.sortOrder },
    ];
  }

  const reordered = [...siblings];
  const [movedTask] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, movedTask);

  const changes = reordered
    .map((candidate, index) => ({
      taskId: candidate.id,
      sortOrder: index + 1,
      previousSortOrder: candidate.sortOrder,
    }))
    .filter((change) => change.sortOrder !== change.previousSortOrder);

  return changes.length > 0 ? changes : null;
}
