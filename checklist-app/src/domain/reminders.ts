import { localDateKey, shiftLocalDateKey, zonedDateTimeToUtc } from "./dates";

export type ReminderTime = {
  hour: number;
  minute: number;
};

export function parseReminderTime(reminderTime: string): ReminderTime | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(reminderTime);
  if (!match) return null;

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export function getNextReminderDate(now: Date, timezone: string, reminderTime: string): Date | null {
  const parsedReminderTime = parseReminderTime(reminderTime);
  if (!parsedReminderTime) return null;

  const today = localDateKey(now, timezone);
  const todayReminder = reminderDateForLocalDate(today, timezone, parsedReminderTime);
  if (todayReminder.getTime() > now.getTime()) {
    return todayReminder;
  }

  return reminderDateForLocalDate(shiftLocalDateKey(today, 1), timezone, parsedReminderTime);
}

function reminderDateForLocalDate(localDate: string, timezone: string, reminderTime: ReminderTime): Date {
  const [year, month, day] = localDate.split("-").map(Number);
  return zonedDateTimeToUtc(year, month, day, reminderTime.hour, reminderTime.minute, 0, timezone);
}
