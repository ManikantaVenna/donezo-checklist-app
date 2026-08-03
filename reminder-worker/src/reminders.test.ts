import { describe, expect, it } from "vitest";
import { buildReminderJobs, isDeadSubscriptionStatus, mapDueReminderRow } from "./reminders";
import type { ReminderDataset } from "./reminders";

const baseDataset = {
  profiles: [{ id: "user-1", timezone: "Asia/Kolkata" }],
  preferences: [{ user_id: "user-1", enabled: true, reminder_time: "17:00:00" }],
  subscriptions: [
    {
      id: "sub-1",
      user_id: "user-1",
      endpoint: "https://push.example/sub-1",
      p256dh: "p256dh",
      auth: "auth",
    },
  ],
  tasks: [
    { id: "daily-1", user_id: "user-1", type: "daily", is_archived: false },
    { id: "quick-1", user_id: "user-1", type: "quick", is_archived: false },
  ],
  completions: [],
} satisfies ReminderDataset;

describe("reminder jobs", () => {
  it("matches reminder time in the user's saved timezone", () => {
    const dueJobs = buildReminderJobs(new Date("2026-08-03T11:30:00.000Z"), baseDataset);
    const earlyJobs = buildReminderJobs(new Date("2026-08-03T11:29:00.000Z"), baseDataset);

    expect(dueJobs).toEqual([
      expect.objectContaining({
        userId: "user-1",
        subscriptionId: "sub-1",
        localDate: "2026-08-03",
        timezone: "Asia/Kolkata",
        reminderTime: "17:00",
        unfinishedCount: 1,
      }),
    ]);
    expect(earlyJobs).toEqual([]);
  });

  it("does not create jobs when all daily routines are complete for that local date", () => {
    const jobs = buildReminderJobs(new Date("2026-08-03T11:30:00.000Z"), {
      ...baseDataset,
      completions: [{ user_id: "user-1", task_id: "daily-1", local_date: "2026-08-03" }],
    });

    expect(jobs).toEqual([]);
  });

  it("treats 404 and 410 push responses as dead subscriptions", () => {
    expect(isDeadSubscriptionStatus(404)).toBe(true);
    expect(isDeadSubscriptionStatus(410)).toBe(true);
    expect(isDeadSubscriptionStatus(429)).toBe(false);
  });

  it("maps Supabase RPC rows to sendable reminder jobs", () => {
    expect(
      mapDueReminderRow({
        subscription_id: "sub-1",
        user_id: "user-1",
        endpoint: "https://push.example/sub-1",
        p256dh: "p256dh",
        auth: "auth",
        timezone: "Asia/Kolkata",
        local_date: "2026-08-03",
        reminder_time: "17:00",
        unfinished_count: 2,
      }),
    ).toEqual({
      subscriptionId: "sub-1",
      userId: "user-1",
      endpoint: "https://push.example/sub-1",
      p256dh: "p256dh",
      auth: "auth",
      timezone: "Asia/Kolkata",
      localDate: "2026-08-03",
      reminderTime: "17:00",
      unfinishedCount: 2,
    });
  });
});
