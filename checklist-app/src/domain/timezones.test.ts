import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMEZONE,
  TIMEZONE_OPTIONS,
  filterTimezoneOptions,
  findTimezoneOption,
  isSupportedTimezone,
  millisecondsUntilNextMinute,
} from "./timezones";

describe("timezone options", () => {
  it("defaults to New York and includes India and the UK", () => {
    expect(DEFAULT_TIMEZONE).toBe("America/New_York");
    expect(findTimezoneOption("America/New_York")?.label).toBe("New York");
    expect(findTimezoneOption("Asia/Kolkata")?.label).toBe("India");
    expect(findTimezoneOption("Europe/London")?.label).toBe("United Kingdom");
  });

  it("only accepts timezone IDs from the picker list", () => {
    expect(TIMEZONE_OPTIONS.length).toBeGreaterThan(30);
    expect(isSupportedTimezone("Asia/Kolkata")).toBe(true);
    expect(isSupportedTimezone("India")).toBe(false);
  });

  it("covers major commonly used world timezones", () => {
    expect(findTimezoneOption("America/Denver")?.label).toBe("Denver");
    expect(findTimezoneOption("America/Mexico_City")?.label).toBe("Mexico City");
    expect(findTimezoneOption("America/Sao_Paulo")?.label).toBe("São Paulo");
    expect(findTimezoneOption("Europe/Berlin")?.label).toBe("Berlin");
    expect(findTimezoneOption("Africa/Johannesburg")?.label).toBe("Johannesburg");
    expect(findTimezoneOption("Asia/Shanghai")?.label).toBe("Shanghai");
    expect(findTimezoneOption("Pacific/Auckland")?.label).toBe("Auckland");
  });

  it("filters timezone options by city, country, or timezone ID", () => {
    expect(filterTimezoneOptions("india").map((option) => option.id)).toContain("Asia/Kolkata");
    expect(filterTimezoneOptions("britain").map((option) => option.id)).toContain("Europe/London");
    expect(filterTimezoneOptions("America/").length).toBeGreaterThan(5);
  });

  it("aligns clock refreshes to the next minute boundary", () => {
    expect(millisecondsUntilNextMinute(new Date("2026-07-18T23:03:00.000Z"))).toBe(60_025);
    expect(millisecondsUntilNextMinute(new Date("2026-07-18T23:03:59.900Z"))).toBe(125);
  });
});
