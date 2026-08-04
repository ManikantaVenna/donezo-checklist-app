import type { CreateTaskInput } from "../data/checklistRepository";
import type { ChecklistSnapshot, Task } from "../domain/types";

const PENDING_TASK_ID_PREFIX = "pending-";

export function createPendingTaskId(sequence: number): string {
  return `${PENDING_TASK_ID_PREFIX}${Date.now()}-${sequence}`;
}

export function isPendingTaskId(taskId: string): boolean {
  return taskId.startsWith(PENDING_TASK_ID_PREFIX);
}

export function nextTaskSortOrder(snapshot: ChecklistSnapshot, input: CreateTaskInput): number {
  const projectId = input.type === "project" ? (input.projectId ?? null) : null;
  const siblings = snapshot.tasks.filter((task) => {
    if (task.isArchived) return false;
    if (input.type === "project") return task.projectId === projectId;
    return task.projectId === null && task.type === input.type;
  });

  if (siblings.length === 0) return 1;

  return siblings.reduce((lowest, task) => Math.min(lowest, task.sortOrder), siblings[0]!.sortOrder) - 1;
}

export function createOptimisticTask(
  snapshot: ChecklistSnapshot,
  userId: string,
  input: CreateTaskInput,
  id: string,
  now: string,
  sortOrder = nextTaskSortOrder(snapshot, input),
): Task {
  const projectId = input.type === "project" ? (input.projectId ?? null) : null;

  return {
    id,
    userId,
    projectId,
    type: input.type,
    title: input.title.trim(),
    sortOrder,
    isArchived: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
