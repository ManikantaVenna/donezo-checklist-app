import type { ChecklistRepository, CreateProjectInput, CreateTaskInput, MoveDirection } from "./checklistRepository";
import type { ChecklistSnapshot, DailyCompletion, Project, ReminderPreferences, Task } from "../domain/types";
import { sortedCopy } from "../domain/sorting";

const DEMO_USER_ID = "demo-user";
const INITIAL_NOW = "2026-07-17T12:00:00.000Z";
const DEFAULT_TIMEZONE = "America/New_York";

function cloneTask(task: Task): Task {
  return { ...task };
}

function cloneProject(project: Project): Project {
  return { ...project };
}

function cloneDailyCompletion(completion: DailyCompletion): DailyCompletion {
  return { ...completion };
}

function cloneReminderPreferences(preferences: ReminderPreferences): ReminderPreferences {
  return { ...preferences };
}

function createDefaultReminderPreferences(userId: string): ReminderPreferences {
  return {
    userId,
    enabled: true,
    reminderTime: "23:00",
  };
}

function getNextSortOrder(items: Array<{ sortOrder: number }>): number {
  return items.reduce((highest, item) => Math.max(highest, item.sortOrder), 0) + 1;
}

function sameTaskList(task: Task, candidate: Task): boolean {
  if (task.projectId !== null) {
    return candidate.projectId === task.projectId;
  }

  return candidate.projectId === null && candidate.type === task.type;
}

function sortByManualOrder<T extends { sortOrder: number; createdAt: string }>(items: T[]): T[] {
  return sortedCopy(items, (first, second) => first.sortOrder - second.sortOrder || first.createdAt.localeCompare(second.createdAt));
}

export class MockChecklistRepository implements ChecklistRepository {
  private tasks: Task[] = [
    {
      id: "daily-1",
      userId: DEMO_USER_ID,
      projectId: null,
      type: "daily",
      title: "Morning stretch",
      sortOrder: 1,
      isArchived: false,
      completedAt: null,
      createdAt: INITIAL_NOW,
      updatedAt: INITIAL_NOW,
    },
    {
      id: "daily-2",
      userId: DEMO_USER_ID,
      projectId: null,
      type: "daily",
      title: "Read 20 minutes",
      sortOrder: 2,
      isArchived: false,
      completedAt: null,
      createdAt: INITIAL_NOW,
      updatedAt: INITIAL_NOW,
    },
    {
      id: "quick-1",
      userId: DEMO_USER_ID,
      projectId: null,
      type: "quick",
      title: "Send invoice",
      sortOrder: 3,
      isArchived: false,
      completedAt: null,
      createdAt: INITIAL_NOW,
      updatedAt: INITIAL_NOW,
    },
    {
      id: "project-task-1",
      userId: DEMO_USER_ID,
      projectId: "project-1",
      type: "project",
      title: "Write release notes",
      sortOrder: 1,
      isArchived: false,
      completedAt: null,
      createdAt: INITIAL_NOW,
      updatedAt: INITIAL_NOW,
    },
  ];

  private projects: Project[] = [
    {
      id: "project-1",
      userId: DEMO_USER_ID,
      name: "Launch checklist",
      sortOrder: 1,
      isArchived: false,
      createdAt: INITIAL_NOW,
      updatedAt: INITIAL_NOW,
    },
  ];

  private dailyCompletions: DailyCompletion[] = [
    {
      id: "daily-completion-1",
      userId: DEMO_USER_ID,
      taskId: "daily-1",
      localDate: "2026-07-17",
      completedAt: INITIAL_NOW,
    },
    {
      id: "daily-completion-2",
      userId: DEMO_USER_ID,
      taskId: "daily-1",
      localDate: "2026-07-16",
      completedAt: INITIAL_NOW,
    },
  ];

  private reminderPreferences = new Map<string, ReminderPreferences>([
    [
      DEMO_USER_ID,
      {
        userId: DEMO_USER_ID,
        enabled: true,
        reminderTime: "23:00",
      },
    ],
  ]);

  private timezones = new Map<string, string>([[DEMO_USER_ID, DEFAULT_TIMEZONE]]);

  private nextTaskId = 1;
  private nextProjectId = 2;
  private nextDailyCompletionId = 3;

  async getSnapshot(userId: string): Promise<ChecklistSnapshot> {
    const reminderPreferences = this.reminderPreferences.get(userId) ?? createDefaultReminderPreferences(userId);

    return {
      tasks: this.tasks
        .filter((task) => task.userId === userId && !task.isArchived)
        .sort((first, second) => first.sortOrder - second.sortOrder || first.createdAt.localeCompare(second.createdAt))
        .map(cloneTask),
      projects: this.projects
        .filter((project) => project.userId === userId && !project.isArchived)
        .sort((first, second) => first.sortOrder - second.sortOrder || first.createdAt.localeCompare(second.createdAt))
        .map(cloneProject),
      dailyCompletions: this.dailyCompletions
        .filter((completion) => completion.userId === userId)
        .map(cloneDailyCompletion),
      reminderPreferences: cloneReminderPreferences(reminderPreferences),
      timezone: this.timezones.get(userId) ?? DEFAULT_TIMEZONE,
    };
  }

  async createTask(userId: string, input: CreateTaskInput): Promise<Task> {
    const now = new Date().toISOString();
    const projectId = input.projectId ?? null;
    const sortSiblings =
      input.type === "project"
        ? this.tasks.filter((task) => task.userId === userId && task.projectId === projectId && !task.isArchived)
        : this.tasks.filter(
            (task) => task.userId === userId && task.projectId === null && task.type === input.type && !task.isArchived,
          );

    const task: Task = {
      id: `task-${this.nextTaskId}`,
      userId,
      projectId,
      type: input.type,
      title: input.title.trim(),
      sortOrder: input.sortOrder ?? getNextSortOrder(sortSiblings),
      isArchived: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.push(task);
    this.nextTaskId += 1;
    return cloneTask(task);
  }

  async renameTask(userId: string, taskId: string, title: string): Promise<void> {
    const task = this.tasks.find((candidate) => candidate.userId === userId && candidate.id === taskId);
    if (!task) {
      return;
    }

    task.title = title.trim();
    task.updatedAt = new Date().toISOString();
  }

  async archiveTask(userId: string, taskId: string): Promise<void> {
    const task = this.tasks.find((candidate) => candidate.userId === userId && candidate.id === taskId);
    if (!task) {
      return;
    }

    task.isArchived = true;
    task.updatedAt = new Date().toISOString();
  }

  async moveTask(userId: string, taskId: string, direction: MoveDirection): Promise<void> {
    const task = this.tasks.find((candidate) => candidate.userId === userId && candidate.id === taskId && !candidate.isArchived);
    if (!task) {
      return;
    }

    const siblings = sortByManualOrder(
      this.tasks.filter((candidate) => candidate.userId === userId && !candidate.isArchived && sameTaskList(task, candidate)),
    );
    const currentIndex = siblings.findIndex((candidate) => candidate.id === taskId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
      return;
    }

    const reordered = [...siblings];
    const [movedTask] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedTask);

    const now = new Date().toISOString();
    reordered.forEach((candidate, index) => {
      candidate.sortOrder = index + 1;
      candidate.updatedAt = now;
    });
  }

  async setTaskComplete(userId: string, taskId: string, localDate: string, complete: boolean): Promise<void> {
    const task = this.tasks.find((candidate) => candidate.userId === userId && candidate.id === taskId);
    if (!task) {
      return;
    }

    const completedAt = new Date().toISOString();

    if (task.type === "daily") {
      if (complete) {
        const alreadyCompleted = this.dailyCompletions.some(
          (completion) =>
            completion.userId === userId && completion.taskId === taskId && completion.localDate === localDate,
        );

        if (!alreadyCompleted) {
          this.dailyCompletions.push({
            id: `daily-completion-${this.nextDailyCompletionId}`,
            userId,
            taskId,
            localDate,
            completedAt,
          });
          this.nextDailyCompletionId += 1;
        }
      } else {
        this.dailyCompletions = this.dailyCompletions.filter(
          (completion) =>
            !(completion.userId === userId && completion.taskId === taskId && completion.localDate === localDate),
        );
      }
      return;
    }

    task.completedAt = complete ? completedAt : null;
    task.updatedAt = completedAt;
  }

  async createProject(userId: string, input: CreateProjectInput): Promise<void> {
    const now = new Date().toISOString();
    const userProjects = this.projects.filter((project) => project.userId === userId);

    this.projects.push({
      id: `project-${this.nextProjectId}`,
      userId,
      name: input.name.trim(),
      sortOrder: getNextSortOrder(userProjects),
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });
    this.nextProjectId += 1;
  }

  async renameProject(userId: string, projectId: string, name: string): Promise<void> {
    const project = this.projects.find((candidate) => candidate.userId === userId && candidate.id === projectId);
    if (!project) {
      return;
    }

    project.name = name.trim();
    project.updatedAt = new Date().toISOString();
  }

  async archiveProject(userId: string, projectId: string): Promise<void> {
    const project = this.projects.find((candidate) => candidate.userId === userId && candidate.id === projectId);
    if (!project) {
      return;
    }

    project.isArchived = true;
    project.updatedAt = new Date().toISOString();

    this.tasks
      .filter((task) => task.userId === userId && task.projectId === projectId)
      .forEach((task) => {
        task.isArchived = true;
        task.updatedAt = project.updatedAt;
      });
  }

  async updateReminderPreference(userId: string, enabled: boolean, reminderTime: string): Promise<void> {
    this.reminderPreferences.set(userId, {
      userId,
      enabled,
      reminderTime,
    });
  }

  async updateTimezone(userId: string, timezone: string): Promise<void> {
    this.timezones.set(userId, timezone.trim() || DEFAULT_TIMEZONE);
  }
}

export const mockChecklistRepository = new MockChecklistRepository();
