import type { CreateTaskInput } from "../data/checklistRepository";
import type { ChecklistSnapshot, Task } from "../domain/types";

export function createOptimisticTask(
  snapshot: ChecklistSnapshot,
  userId: string,
  input: CreateTaskInput,
  id: string,
  now: string,
): Task {
  const projectId = input.type === "project" ? (input.projectId ?? null) : null;
  const siblings = snapshot.tasks.filter((task) => {
    if (task.isArchived) return false;
    if (input.type === "project") return task.projectId === projectId;
    return task.projectId === null && task.type === input.type;
  });
  const sortOrder = siblings.reduce((highest, task) => Math.max(highest, task.sortOrder), 0) + 1;

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
