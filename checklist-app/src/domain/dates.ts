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

export function isCompletedOnDate(completions: DailyCompletion[], taskId: string, localDate: string): boolean {
  return completions.some((completion) => completion.taskId === taskId && completion.localDate === localDate);
}

export function calculateCurrentStreak(completions: DailyCompletion[], taskId: string, todayLocalDate: string): number {
  const completedDates = new Set(
    completions.filter((completion) => completion.taskId === taskId).map((completion) => completion.localDate),
  );
  let streak = 0;
  let cursor = todayLocalDate;
  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = shiftLocalDateKey(cursor, -1);
  }
  return streak;
}
