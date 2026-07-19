import type { DailyCompletion } from "./types";

export function localDateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const part = (type: string) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function shiftLocalDateKey(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

export function getNextLocalMidnight(date: Date, timezone: string): Date {
  const nextLocalDate = shiftLocalDateKey(localDateKey(date, timezone), 1);
  const [year, month, day] = nextLocalDate.split("-").map(Number);
  return zonedDateTimeToUtc(year, month, day, 0, 0, 0, timezone);
}

export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string,
): Date {
  const localTimeAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let utcTime = localTimeAsUtc - getTimeZoneOffsetMs(new Date(localTimeAsUtc), timezone);

  for (let index = 0; index < 2; index += 1) {
    utcTime = localTimeAsUtc - getTimeZoneOffsetMs(new Date(utcTime), timezone);
  }

  return new Date(utcTime);
}

function getTimeZoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value);
  const localTimeAsUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );

  return localTimeAsUtc - date.getTime();
}

export function isCompletedOnDate(completions: DailyCompletion[], taskId: string, localDate: string): boolean {
  return completions.some((completion) => completion.taskId === taskId && completion.localDate === localDate);
}

export function calculateCurrentStreak(completions: DailyCompletion[], taskId: string, todayLocalDate: string): number {
  const completedDates = new Set(
    completions.filter((completion) => completion.taskId === taskId).map((completion) => completion.localDate),
  );
  let cursor = completedDates.has(todayLocalDate)
    ? todayLocalDate
    : shiftLocalDateKey(todayLocalDate, -1);
  let streak = 0;

  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = shiftLocalDateKey(cursor, -1);
  }
  return streak;
}
