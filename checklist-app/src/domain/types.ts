export type TaskType = "quick" | "daily" | "project";

export type Task = {
  id: string;
  userId: string;
  projectId: string | null;
  type: TaskType;
  title: string;
  sortOrder: number;
  isArchived: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  userId: string;
  name: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DailyCompletion = {
  id: string;
  userId: string;
  taskId: string;
  localDate: string;
  completedAt: string;
};

export type ReminderPreferences = {
  userId: string;
  enabled: boolean;
  reminderTime: string;
};

export type WebPushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
};

export type ChecklistSnapshot = {
  tasks: Task[];
  projects: Project[];
  dailyCompletions: DailyCompletion[];
  reminderPreferences: ReminderPreferences;
  timezone: string;
};

export type TaskStatus = {
  task: Task;
  isCompleteToday: boolean;
  streak: number;
};
