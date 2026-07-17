import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const DAILY_REMINDER_IDENTIFIER_PREFIX = "daily-reset-reminder";
let scheduleSequence = 0;
let scheduleOperation: Promise<void> = Promise.resolve();

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
      unfinishedCount === 1
        ? "You have 1 unfinished daily task."
        : `You have ${unfinishedCount} unfinished daily tasks.`,
  };
}

function reminderIdentifier(reminderTime: string) {
  return `${DAILY_REMINDER_IDENTIFIER_PREFIX}-${reminderTime}`;
}

function parseReminderTime(reminderTime: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(reminderTime);
  if (!match) return null;

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export async function cancelDailyReminders() {
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
) {
  const sequence = ++scheduleSequence;
  const operation = scheduleOperation
    .catch(() => undefined)
    .then(() => scheduleDailyReminderForSequence(sequence, unfinishedCount, enabled, reminderTime));
  scheduleOperation = operation.catch(() => undefined);

  return operation;
}

async function scheduleDailyReminderForSequence(
  sequence: number,
  unfinishedCount: number,
  enabled: boolean,
  reminderTime: string,
) {
  await cancelDailyReminders();
  if (sequence !== scheduleSequence) return;

  const parsedReminderTime = parseReminderTime(reminderTime);
  if (!enabled || unfinishedCount <= 0 || !parsedReminderTime) return;
  const content = reminderContent(unfinishedCount);

  if (Platform.OS === "web") {
    return;
  }

  if (!Device.isDevice) return;

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (sequence !== scheduleSequence) return;
  if (permission.status !== "granted") return;

  await Notifications.scheduleNotificationAsync({
    content: {
      ...content,
      data: { identifier: reminderIdentifier(reminderTime) },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: parsedReminderTime.hour,
      minute: parsedReminderTime.minute,
    },
  });
}
