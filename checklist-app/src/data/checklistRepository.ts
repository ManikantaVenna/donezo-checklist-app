import type { ChecklistSnapshot, Task, TaskType } from "../domain/types";

export type MoveDirection = "up" | "down";

export type CreateTaskInput = {
  title: string;
  type: TaskType;
  projectId?: string | null;
  sortOrder?: number;
};

export type CreateProjectInput = {
  name: string;
};

export type ChecklistRepository = {
  getSnapshot(userId: string): Promise<ChecklistSnapshot>;
  subscribeToChanges?: (userId: string, onChange: () => void) => () => void;
  createTask(userId: string, input: CreateTaskInput): Promise<Task>;
  renameTask(userId: string, taskId: string, title: string): Promise<void>;
  archiveTask(userId: string, taskId: string): Promise<void>;
  moveTask(userId: string, taskId: string, direction: MoveDirection): Promise<void>;
  setTaskComplete(userId: string, taskId: string, localDate: string, complete: boolean): Promise<void>;
  createProject(userId: string, input: CreateProjectInput): Promise<void>;
  renameProject(userId: string, projectId: string, name: string): Promise<void>;
  archiveProject(userId: string, projectId: string): Promise<void>;
  updateReminderPreference(userId: string, enabled: boolean, reminderTime: string): Promise<void>;
  updateTimezone(userId: string, timezone: string): Promise<void>;
};
