import type { ChecklistSnapshot, Task, TaskType, WebPushSubscriptionInput } from "../domain/types";
import type { TaskOrderChange } from "../domain/ordering";

export type { MoveDirection, TaskOrderChange } from "../domain/ordering";

export type CreateTaskInput = {
  title: string;
  type: TaskType;
  projectId?: string | null;
  sortOrder?: number;
};

export type CreateProjectInput = {
  name: string;
};

export type ChecklistChangeReason = "event" | "initial-subscribe" | "resubscribe";

export type ChecklistRepository = {
  getSnapshot(userId: string): Promise<ChecklistSnapshot>;
  subscribeToChanges?: (userId: string, onChange: (reason: ChecklistChangeReason) => void) => () => void;
  createTask(userId: string, input: CreateTaskInput): Promise<Task>;
  renameTask(userId: string, taskId: string, title: string): Promise<void>;
  archiveTask(userId: string, taskId: string): Promise<void>;
  updateTaskOrders(userId: string, changes: TaskOrderChange[]): Promise<void>;
  setTaskComplete(userId: string, taskId: string, localDate: string, complete: boolean, taskType: TaskType): Promise<void>;
  createProject(userId: string, input: CreateProjectInput): Promise<void>;
  renameProject(userId: string, projectId: string, name: string): Promise<void>;
  archiveProject(userId: string, projectId: string): Promise<void>;
  updateReminderPreference(userId: string, enabled: boolean, reminderTime: string): Promise<void>;
  updateTimezone(userId: string, timezone: string): Promise<void>;
  saveWebPushSubscription?(userId: string, subscription: WebPushSubscriptionInput): Promise<void>;
  deleteWebPushSubscription?(userId: string, endpoint: string): Promise<void>;
};
