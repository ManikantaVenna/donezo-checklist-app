import type { ChecklistRepository, CreateProjectInput, CreateTaskInput, MoveDirection } from "./checklistRepository";
import type { DailyCompletion, Project, ReminderPreferences, Task, TaskType } from "../domain/types";
import { supabase } from "../lib/supabase";

type ProfileRow = {
  timezone: string;
};

type TaskRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  type: TaskType;
  title: string;
  sort_order: number;
  is_archived: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type DailyCompletionRow = {
  id: string;
  user_id: string;
  task_id: string;
  local_date: string;
  completed_at: string;
};

type ReminderPreferenceRow = {
  user_id: string;
  enabled: boolean;
  reminder_time: string;
};

function client() {
  if (supabase === null) {
    throw new Error("Supabase environment is not configured.");
  }

  return supabase;
}

function throwIfError(result: { error: unknown }): void {
  if (result.error) {
    throw result.error;
  }
}

function requireData<T>(data: T | null, message: string): T {
  if (data === null) {
    throw new Error(message);
  }

  return data;
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    type: row.type,
    title: row.title,
    sortOrder: row.sort_order,
    isArchived: row.is_archived,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    sortOrder: row.sort_order,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDailyCompletion(row: DailyCompletionRow): DailyCompletion {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    localDate: row.local_date,
    completedAt: row.completed_at,
  };
}

function mapReminderPreferences(row: ReminderPreferenceRow): ReminderPreferences {
  return {
    userId: row.user_id,
    enabled: row.enabled,
    reminderTime: row.reminder_time.slice(0, 5),
  };
}

function sortByManualOrder<T extends { sort_order: number; created_at: string }>(rows: T[]): T[] {
  return rows.toSorted((first, second) => first.sort_order - second.sort_order || first.created_at.localeCompare(second.created_at));
}

export const supabaseChecklistRepository: ChecklistRepository = {
  async getSnapshot(userId) {
    const db = client();
    const [profile, tasks, projects, dailyCompletions, reminderPreferences] = await Promise.all([
      db.from("profiles").select("timezone").eq("id", userId).single(),
      db.from("tasks").select("*").eq("user_id", userId).eq("is_archived", false).order("sort_order"),
      db.from("projects").select("*").eq("user_id", userId).eq("is_archived", false).order("sort_order"),
      db.from("daily_completions").select("*").eq("user_id", userId),
      db.from("reminder_preferences").select("*").eq("user_id", userId).single(),
    ]);

    for (const result of [profile, tasks, projects, dailyCompletions, reminderPreferences]) {
      throwIfError(result);
    }

    const profileRow = requireData(profile.data as ProfileRow | null, "Profile not found.");
    const taskRows = (tasks.data ?? []) as TaskRow[];
    const projectRows = (projects.data ?? []) as ProjectRow[];
    const dailyCompletionRows = (dailyCompletions.data ?? []) as DailyCompletionRow[];
    const reminderPreferenceRow = requireData(
      reminderPreferences.data as ReminderPreferenceRow | null,
      "Reminder preferences not found.",
    );

    return {
      tasks: taskRows.map(mapTask),
      projects: projectRows.map(mapProject),
      dailyCompletions: dailyCompletionRows.map(mapDailyCompletion),
      reminderPreferences: mapReminderPreferences(reminderPreferenceRow),
      timezone: profileRow.timezone,
    };
  },

  async createTask(userId, input: CreateTaskInput) {
    const db = client();
    let orderQuery = db
      .from("tasks")
      .select("sort_order")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("sort_order", { ascending: false })
      .limit(1);

    if (input.type === "project") {
      orderQuery = orderQuery.eq("project_id", input.projectId ?? "");
    } else {
      orderQuery = orderQuery.is("project_id", null).eq("type", input.type);
    }

    const orderResult = await orderQuery;
    throwIfError(orderResult);

    const highestSortOrder = ((orderResult.data?.[0] as Pick<TaskRow, "sort_order"> | undefined)?.sort_order ?? 0) + 1;

    const { error } = await db.from("tasks").insert({
      user_id: userId,
      project_id: input.projectId ?? null,
      type: input.type,
      title: input.title.trim(),
      sort_order: highestSortOrder,
    });

    throwIfError({ error });
  },

  async renameTask(userId, taskId, title) {
    const { error } = await client().from("tasks").update({ title: title.trim() }).eq("user_id", userId).eq("id", taskId);

    throwIfError({ error });
  },

  async archiveTask(userId, taskId) {
    const { error } = await client()
      .from("tasks")
      .update({ is_archived: true })
      .eq("user_id", userId)
      .eq("id", taskId);

    throwIfError({ error });
  },

  async moveTask(userId, taskId, direction: MoveDirection) {
    const db = client();
    const taskResult = await db
      .from("tasks")
      .select("id,user_id,project_id,type,sort_order,is_archived,created_at,updated_at,title,completed_at")
      .eq("user_id", userId)
      .eq("id", taskId)
      .eq("is_archived", false)
      .single();

    throwIfError(taskResult);

    const task = requireData(taskResult.data as TaskRow | null, "Task not found.");
    let siblingsQuery = db
      .from("tasks")
      .select("id,user_id,project_id,type,sort_order,is_archived,created_at,updated_at,title,completed_at")
      .eq("user_id", userId)
      .eq("is_archived", false);

    if (task.project_id) {
      siblingsQuery = siblingsQuery.eq("project_id", task.project_id);
    } else {
      siblingsQuery = siblingsQuery.is("project_id", null).eq("type", task.type);
    }

    const siblingsResult = await siblingsQuery.order("sort_order").order("created_at");
    throwIfError(siblingsResult);

    const siblings = sortByManualOrder((siblingsResult.data ?? []) as TaskRow[]);
    const currentIndex = siblings.findIndex((row) => row.id === taskId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
      return;
    }

    const reordered = [...siblings];
    const [movedTask] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedTask);

    await Promise.all(
      reordered.map((row, index) =>
        db.from("tasks").update({ sort_order: index + 1 }).eq("user_id", userId).eq("id", row.id),
      ),
    ).then((results) => {
      results.forEach(throwIfError);
    });
  },

  async setTaskComplete(userId, taskId, localDate, complete) {
    const db = client();
    const task = await db.from("tasks").select("type").eq("user_id", userId).eq("id", taskId).single();

    throwIfError(task);

    const taskRow = requireData(task.data as Pick<TaskRow, "type"> | null, "Task not found.");

    if (taskRow.type === "daily") {
      const result = complete
        ? await db
            .from("daily_completions")
            .upsert({ user_id: userId, task_id: taskId, local_date: localDate }, { onConflict: "user_id,task_id,local_date" })
        : await db
            .from("daily_completions")
            .delete()
            .eq("user_id", userId)
            .eq("task_id", taskId)
            .eq("local_date", localDate);

      throwIfError(result);
      return;
    }

    const { error } = await db
      .from("tasks")
      .update({ completed_at: complete ? new Date().toISOString() : null })
      .eq("user_id", userId)
      .eq("id", taskId);

    throwIfError({ error });
  },

  async createProject(userId, input: CreateProjectInput) {
    const { error } = await client().from("projects").insert({ user_id: userId, name: input.name.trim() });

    throwIfError({ error });
  },

  async renameProject(userId, projectId, name) {
    const { error } = await client()
      .from("projects")
      .update({ name: name.trim() })
      .eq("user_id", userId)
      .eq("id", projectId);

    throwIfError({ error });
  },

  async archiveProject(userId, projectId) {
    const db = client();
    const projectResult = await db
      .from("projects")
      .update({ is_archived: true })
      .eq("user_id", userId)
      .eq("id", projectId);

    throwIfError(projectResult);

    const taskResult = await db
      .from("tasks")
      .update({ is_archived: true })
      .eq("user_id", userId)
      .eq("project_id", projectId);

    throwIfError(taskResult);
  },

  async updateReminderPreference(userId, enabled, reminderTime) {
    const { error } = await client()
      .from("reminder_preferences")
      .upsert({ user_id: userId, enabled, reminder_time: reminderTime });

    throwIfError({ error });
  },

  async updateTimezone(userId, timezone) {
    const { error } = await client().from("profiles").update({ timezone }).eq("id", userId);

    throwIfError({ error });
  },
};
