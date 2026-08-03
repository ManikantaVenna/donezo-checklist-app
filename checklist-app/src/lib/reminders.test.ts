import { beforeEach, describe, expect, it, vi } from "vitest";

const notificationMocks = vi.hoisted(() => ({
  cancelScheduledNotificationAsync: vi.fn(async () => undefined),
  getAllScheduledNotificationsAsync: vi.fn(async () => []),
  getPermissionsAsync: vi.fn(async () => ({ status: "granted" })),
  requestPermissionsAsync: vi.fn(async () => ({ status: "granted" })),
  scheduleNotificationAsync: vi.fn(async () => "notification-1"),
  setNotificationChannelAsync: vi.fn(async () => null),
  setNotificationHandler: vi.fn(),
}));

vi.mock("expo-device", () => ({ isDevice: true }));

vi.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  ...notificationMocks,
}));

vi.mock("react-native", () => ({ Platform: { OS: "android" } }));

import { scheduleDailyReminder } from "./reminders";

describe("mobile daily reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T23:05:00.000Z"));
    notificationMocks.getAllScheduledNotificationsAsync.mockResolvedValue([]);
    notificationMocks.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    notificationMocks.requestPermissionsAsync.mockResolvedValue({ status: "granted" });
  });

  it("creates the Android channel before checking permission", async () => {
    await scheduleDailyReminder(1, true, "19:06", "America/New_York");

    expect(notificationMocks.setNotificationChannelAsync).toHaveBeenCalledWith("daily-reminders", {
      name: "Daily reminders",
      importance: 3,
    });
    expect(notificationMocks.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      notificationMocks.getPermissionsAsync.mock.invocationCallOrder[0],
    );
  });

  it("schedules the selected time on the Android reminder channel", async () => {
    await scheduleDailyReminder(2, true, "19:06", "America/New_York");

    expect(notificationMocks.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: {
          type: "date",
          date: new Date("2026-07-18T23:06:00.000Z"),
          channelId: "daily-reminders",
        },
      }),
    );
  });

  it("does not schedule an enabled reminder when no daily task is unfinished", async () => {
    await scheduleDailyReminder(0, true, "19:06", "America/New_York");

    expect(notificationMocks.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("does not schedule when reminders are turned off", async () => {
    await scheduleDailyReminder(1, false, "19:06", "America/New_York");

    expect(notificationMocks.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
