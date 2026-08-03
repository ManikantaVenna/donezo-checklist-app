import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export type ProfileRow = {
  id: string;
  timezone: string;
};

export type ReminderPreferenceRow = {
  user_id: string;
  enabled: boolean;
  reminder_time: string;
};

export type WebPushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type TaskRow = {
  id: string;
  user_id: string;
  type: "quick" | "daily" | "project";
  is_archived: boolean;
};

export type DailyCompletionRow = {
  user_id: string;
  task_id: string;
  local_date: string;
};

export type ReminderDataset = {
  profiles: ProfileRow[];
  preferences: ReminderPreferenceRow[];
  subscriptions: WebPushSubscriptionRow[];
  tasks: TaskRow[];
  completions: DailyCompletionRow[];
};

export type ReminderJob = {
  userId: string;
  subscriptionId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  localDate: string;
  reminderTime: string;
  unfinishedCount: number;
};

export type ReminderWorkerEnv = {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  REMINDER_WORKER_TOKEN: string;
  WEB_PUSH_PUBLIC_KEY: string;
  WEB_PUSH_PRIVATE_KEY: string;
  WEB_PUSH_SUBJECT: string;
};

export type ReminderRunResult = {
  dueJobs: number;
  sent: number;
  deletedSubscriptions: number;
  failed: number;
};

export type DueReminderRpcRow = {
  subscription_id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  local_date: string;
  reminder_time: string;
  unfinished_count: number;
};

export function buildReminderJobs(now: Date, dataset: ReminderDataset): ReminderJob[] {
  const preferencesByUser = new Map(dataset.preferences.map((preference) => [preference.user_id, preference]));
  const subscriptionsByUser = groupBy(dataset.subscriptions, (subscription) => subscription.user_id);
  const tasksByUser = groupBy(dataset.tasks, (task) => task.user_id);
  const completionsByUser = groupBy(dataset.completions, (completion) => completion.user_id);
  const jobs: ReminderJob[] = [];

  for (const profile of dataset.profiles) {
    const preference = preferencesByUser.get(profile.id);
    if (!preference?.enabled) continue;

    const local = getLocalDateTime(now, profile.timezone);
    if (!local) continue;

    const reminderTime = normalizeReminderTime(preference.reminder_time);
    if (local.time !== reminderTime) continue;

    const unfinishedCount = countUnfinishedDailyTasks(
      tasksByUser.get(profile.id) ?? [],
      completionsByUser.get(profile.id) ?? [],
      local.date,
    );
    if (unfinishedCount <= 0) continue;

    for (const subscription of subscriptionsByUser.get(profile.id) ?? []) {
      jobs.push({
        userId: profile.id,
        subscriptionId: subscription.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        timezone: profile.timezone,
        localDate: local.date,
        reminderTime,
        unfinishedCount,
      });
    }
  }

  return jobs;
}

export function isDeadSubscriptionStatus(status: number): boolean {
  return status === 404 || status === 410;
}

export function mapDueReminderRow(row: DueReminderRpcRow): ReminderJob {
  return {
    subscriptionId: row.subscription_id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    timezone: row.timezone,
    localDate: row.local_date,
    reminderTime: row.reminder_time,
    unfinishedCount: row.unfinished_count,
  };
}

export async function runScheduledReminders(env: ReminderWorkerEnv, now = new Date()): Promise<ReminderRunResult> {
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const jobs = await loadDueReminderJobs(db, env.REMINDER_WORKER_TOKEN, now);
  const result: ReminderRunResult = {
    dueJobs: jobs.length,
    sent: 0,
    deletedSubscriptions: 0,
    failed: 0,
  };

  webpush.setVapidDetails(env.WEB_PUSH_SUBJECT, env.WEB_PUSH_PUBLIC_KEY, env.WEB_PUSH_PRIVATE_KEY);

  for (const job of jobs) {
    try {
      await sendReminder(job);
      result.sent += 1;
    } catch (err) {
      const status = getPushErrorStatus(err);
      if (status && isDeadSubscriptionStatus(status)) {
        await deleteSubscription(db, env.REMINDER_WORKER_TOKEN, job.subscriptionId);
        result.deletedSubscriptions += 1;
        continue;
      }

      result.failed += 1;
      console.error(
        JSON.stringify({
          event: "web_push_send_failed",
          subscriptionId: job.subscriptionId,
          userId: job.userId,
          status,
        }),
      );
    }
  }

  return result;
}

async function loadDueReminderJobs(
  db: SupabaseClient,
  workerToken: string,
  now: Date,
): Promise<ReminderJob[]> {
  const { data, error } = await db.rpc("get_due_web_push_reminders", {
    worker_token: workerToken,
    run_at: now.toISOString(),
  });
  if (error) throw error;

  return ((data ?? []) as DueReminderRpcRow[]).map(mapDueReminderRow);
}

async function sendReminder(job: ReminderJob): Promise<void> {
  await webpush.sendNotification(
    {
      endpoint: job.endpoint,
      keys: {
        p256dh: job.p256dh,
        auth: job.auth,
      },
    },
    JSON.stringify({
      title: "Daily routines waiting",
      body:
        job.unfinishedCount === 1
          ? "You have 1 unfinished daily routine in Donezo."
          : `You have ${job.unfinishedCount} unfinished daily routines in Donezo.`,
      url: "/",
    }),
    { TTL: 60 * 60 },
  );
}

async function deleteSubscription(
  db: SupabaseClient,
  workerToken: string,
  subscriptionId: string,
): Promise<void> {
  const { error } = await db.rpc("delete_web_push_subscription", {
    worker_token: workerToken,
    subscription_id: subscriptionId,
  });
  if (error) throw error;
}

function countUnfinishedDailyTasks(
  tasks: TaskRow[],
  completions: DailyCompletionRow[],
  localDate: string,
): number {
  const completedTaskIds = new Set(
    completions.filter((completion) => completion.local_date === localDate).map((completion) => completion.task_id),
  );

  return tasks.filter(
    (task) => task.type === "daily" && !task.is_archived && !completedTaskIds.has(task.id),
  ).length;
}

function getLocalDateTime(date: Date, timezone: string): { date: string; time: string } | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((part) => [part.type, part.value]),
    );
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      time: `${parts.hour}:${parts.minute}`,
    };
  } catch (_err) {
    return null;
  }
}

function normalizeReminderTime(reminderTime: string): string {
  return reminderTime.slice(0, 5);
}

function groupBy<T>(items: T[], keyForItem: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyForItem(item);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
}

function getPushErrorStatus(err: unknown): number | null {
  if (!err || typeof err !== "object" || !("statusCode" in err)) return null;
  const status = Number((err as { statusCode: unknown }).statusCode);
  return Number.isFinite(status) ? status : null;
}
