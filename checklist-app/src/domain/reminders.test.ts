import { describe, expect, it } from "vitest";
import { getNextReminderDate, parseReminderTime } from "./reminders";

describe("parseReminderTime", () => {
  it("accepts strict 24-hour reminder times", () => {
    expect(parseReminderTime("23:00")).toEqual({ hour: 23, minute: 0 });
    expect(parseReminderTime("07:30")).toEqual({ hour: 7, minute: 30 });
    expect(parseReminderTime("7:30")).toBeNull();
    expect(parseReminderTime("24:00")).toBeNull();
  });
});

describe("getNextReminderDate", () => {
  it("calculates the next reminder instant in the selected timezone", () => {
    const now = new Date("2026-07-17T15:30:00.000Z");

    expect(getNextReminderDate(now, "America/New_York", "23:00")?.toISOString()).toBe("2026-07-18T03:00:00.000Z");
    expect(getNextReminderDate(now, "Asia/Kolkata", "23:00")?.toISOString()).toBe("2026-07-17T17:30:00.000Z");
    expect(getNextReminderDate(now, "Europe/London", "23:00")?.toISOString()).toBe("2026-07-17T22:00:00.000Z");
  });

  it("uses tomorrow when today's selected-zone reminder time already passed", () => {
    const now = new Date("2026-07-18T04:30:00.000Z");

    expect(getNextReminderDate(now, "America/New_York", "23:00")?.toISOString()).toBe("2026-07-19T03:00:00.000Z");
  });
});
