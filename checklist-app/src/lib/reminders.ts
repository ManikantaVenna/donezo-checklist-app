import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const DAILY_REMINDER_IDENTIFIER_PREFIX = "daily-reset-reminder";

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
  await cancelDailyReminders();
  if (!enabled || unfinishedCount <= 0) return;

  const content = reminderContent(unfinishedCount);

  if (Platform.OS === "web") {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(content.title, { body: content.body });
    }
    return;
  }

  if (!Device.isDevice) return;

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (permission.status !== "granted") return;

  const [hour, minute] = reminderTime.split(":").map(Number);
  await Notifications.scheduleNotificationAsync({
    content: {
      ...content,
      data: { identifier: reminderIdentifier(reminderTime) },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
