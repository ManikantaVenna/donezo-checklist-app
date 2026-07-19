import { describe, expect, it } from "vitest";
import {
  calculateCurrentStreak,
  getNextLocalMidnight,
  isCompletedOnDate,
  localDateKey,
  shiftLocalDateKey,
} from "./dates";
import type { DailyCompletion } from "./types";

const completion = (taskId: string, localDate: string): DailyCompletion => ({
  id: `${taskId}-${localDate}`,
  userId: "user-1",
  taskId,
  localDate,
  completedAt: `${localDate}T12:00:00.000Z`,
});

describe("localDateKey", () => {
  it("uses the supplied timezone instead of the computer timezone", () => {
    const date = new Date("2026-07-18T03:30:00.000Z");
    expect(localDateKey(date, "America/New_York")).toBe("2026-07-17");
    expect(localDateKey(date, "Asia/Kolkata")).toBe("2026-07-18");
  });
});

describe("shiftLocalDateKey", () => {
  it("moves across month boundaries", () => {
    expect(shiftLocalDateKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftLocalDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("isCompletedOnDate", () => {
  it("detects completion for a single task on a local date", () => {
    const completions = [completion("daily-1", "2026-07-17")];
    expect(isCompletedOnDate(completions, "daily-1", "2026-07-17")).toBe(true);
    expect(isCompletedOnDate(completions, "daily-2", "2026-07-17")).toBe(false);
  });
});

describe("calculateCurrentStreak", () => {
  it("counts backward from today while dates are consecutive", () => {
    const completions = [
      completion("daily-1", "2026-07-17"),
      completion("daily-1", "2026-07-16"),
      completion("daily-1", "2026-07-15"),
      completion("daily-1", "2026-07-13"),
    ];

    expect(calculateCurrentStreak(completions, "daily-1", "2026-07-17")).toBe(3);
  });

  it("returns zero when today was missed", () => {
    const completions = [completion("daily-1", "2026-07-15")];
    expect(calculateCurrentStreak(completions, "daily-1", "2026-07-17")).toBe(0);
  });

  it("keeps yesterday's consecutive streak active while today is still open", () => {
    const completions = [
      completion("daily-1", "2026-07-18"),
      completion("daily-1", "2026-07-17"),
    ];
    expect(calculateCurrentStreak(completions, "daily-1", "2026-07-19")).toBe(2);
  });

  it("resets after a complete local day is missed", () => {
    const completions = [completion("daily-1", "2026-07-17")];
    expect(calculateCurrentStreak(completions, "daily-1", "2026-07-19")).toBe(0);
  });

  it("increments immediately when today is completed", () => {
    const completions = [
      completion("daily-1", "2026-07-19"),
      completion("daily-1", "2026-07-18"),
    ];
    expect(calculateCurrentStreak(completions, "daily-1", "2026-07-19")).toBe(2);
  });
});

describe("getNextLocalMidnight", () => {
  it("returns the next midnight instant for the selected timezone", () => {
    const date = new Date("2026-07-17T15:30:00.000Z");

    expect(getNextLocalMidnight(date, "America/New_York").toISOString()).toBe("2026-07-18T04:00:00.000Z");
    expect(getNextLocalMidnight(date, "Asia/Kolkata").toISOString()).toBe("2026-07-17T18:30:00.000Z");
    expect(getNextLocalMidnight(date, "Europe/London").toISOString()).toBe("2026-07-17T23:00:00.000Z");
  });
});
