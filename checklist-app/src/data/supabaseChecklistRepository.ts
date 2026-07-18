import type { ChecklistRepository, CreateProjectInput, CreateTaskInput } from "./checklistRepository";
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

  subscribeToChanges(userId, onChange) {
    const db = client();
    const channel = db
      .channel(`checklist-sync:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: `user_id=eq.${userId}` }, onChange)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_completions", filter: `user_id=eq.${userId}` },
        onChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reminder_preferences", filter: `user_id=eq.${userId}` },
        onChange,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, onChange);

    void channel.subscribe();

    return () => {
      void db.removeChannel(channel);
    };
  },

  async createTask(userId, input: CreateTaskInput) {
    const db = client();
    let sortOrder = input.sortOrder;

    if (sortOrder === undefined) {
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
      sortOrder = ((orderResult.data?.[0] as Pick<TaskRow, "sort_order"> | undefined)?.sort_order ?? 0) + 1;
    }

    const result = await db
      .from("tasks")
      .insert({
        user_id: userId,
        project_id: input.projectId ?? null,
        type: input.type,
        title: input.title.trim(),
        sort_order: sortOrder,
      })
      .select("*")
      .single();

    throwIfError(result);
    return mapTask(requireData(result.data as TaskRow | null, "Created task was not returned."));
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

  async updateTaskOrders(userId, changes) {
    if (changes.length === 0) return;

    const db = client();
    // Note: each row is a separate PostgREST update, so a mid-flight failure can
    // apply only part of the swap. Callers revert optimistically and reconcile
    // with a refresh; sort ties fall back to created_at ordering.
    const results = await Promise.all(
      changes.map((change) =>
        db.from("tasks").update({ sort_order: change.sortOrder }).eq("user_id", userId).eq("id", change.taskId),
      ),
    );
    results.forEach(throwIfError);
  },

  async setTaskComplete(userId, taskId, localDate, complete, taskType) {
    const db = client();

    if (taskType === "daily") {
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
