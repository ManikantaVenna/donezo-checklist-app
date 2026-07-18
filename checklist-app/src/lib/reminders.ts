import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getNextReminderDate } from "../domain/reminders";

const DAILY_REMINDER_IDENTIFIER_PREFIX = "daily-reset-reminder";
const ANDROID_REMINDER_CHANNEL_ID = "daily-reminders";
let scheduleSequence = 0;
let scheduleOperation: Promise<void> = Promise.resolve();
let webReminderTimeout: ReturnType<typeof setTimeout> | null = null;

type WebNotificationPermission = "default" | "denied" | "granted";
type WebNotificationConstructor = {
  permission: WebNotificationPermission;
  requestPermission: () => Promise<WebNotificationPermission>;
  new (title: string, options?: { body?: string }): unknown;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function reminderContent(unfinishedCount: number) {
  return {
    title: "Daily reset soon",
    body:
      unfinishedCount === 0
        ? "Take a moment to review your Donezo checklist."
        : unfinishedCount === 1
        ? "You have 1 unfinished daily task."
        : `You have ${unfinishedCount} unfinished daily tasks.`,
  };
}

function reminderIdentifier(reminderTime: string, timezone: string) {
  return `${DAILY_REMINDER_IDENTIFIER_PREFIX}-${timezone}-${reminderTime}`;
}

export async function cancelDailyReminders() {
  if (webReminderTimeout) {
    clearTimeout(webReminderTimeout);
    webReminderTimeout = null;
  }

  if (Platform.OS === "web" || !Device.isDevice) return;

  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduledNotifications
      .filter((notification) => {
        const identifier = notification.content.data?.identifier;
        return typeof identifier === "string" && identifier.startsWith(DAILY_REMINDER_IDENTIFIER_PREFIX);
      })
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

export async function scheduleDailyReminder(
  unfinishedCount: number,
  enabled: boolean,
  reminderTime: string,
  timezone: string,
) {
  const sequence = ++scheduleSequence;
  const operation = scheduleOperation
    .catch(() => undefined)
    .then(() => scheduleDailyReminderForSequence(sequence, unfinishedCount, enabled, reminderTime, timezone));
  scheduleOperation = operation.catch(() => undefined);

  return operation;
}

async function scheduleDailyReminderForSequence(
  sequence: number,
  unfinishedCount: number,
  enabled: boolean,
  reminderTime: string,
  timezone: string,
) {
  await cancelDailyReminders();
  if (sequence !== scheduleSequence) return;

  const nextReminderDate = getNextReminderDate(new Date(), timezone, reminderTime);
  if (!enabled || !nextReminderDate) return;
  const content = reminderContent(unfinishedCount);

  if (Platform.OS === "web") {
    await scheduleWebReminder(content, nextReminderDate);
    return;
  }

  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_REMINDER_CHANNEL_ID, {
      name: "Daily reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (sequence !== scheduleSequence) return;
  if (permission.status !== "granted") return;

  await Notifications.scheduleNotificationAsync({
    content: {
      ...content,
      data: { identifier: reminderIdentifier(reminderTime, timezone) },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextReminderDate,
      ...(Platform.OS === "android" ? { channelId: ANDROID_REMINDER_CHANNEL_ID } : {}),
    },
  });
}

async function scheduleWebReminder(content: ReturnType<typeof reminderContent>, reminderDate: Date) {
  const WebNotification = (globalThis as unknown as { Notification?: WebNotificationConstructor }).Notification;
  if (!WebNotification) return;

  let permission = WebNotification.permission;
  if (permission === "default") {
    permission = await WebNotification.requestPermission();
  }
  if (permission !== "granted") return;

  const delay = Math.max(1_000, reminderDate.getTime() - Date.now());
  webReminderTimeout = setTimeout(() => {
    webReminderTimeout = null;
    new WebNotification(content.title, { body: content.body });
  }, Math.min(delay, 2_147_483_647));
}
