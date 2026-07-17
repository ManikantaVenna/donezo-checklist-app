import { describe, expect, it } from "vitest";
import { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS, findTimezoneOption, isSupportedTimezone } from "./timezones";

describe("timezone options", () => {
  it("defaults to New York and includes India and the UK", () => {
    expect(DEFAULT_TIMEZONE).toBe("America/New_York");
    expect(findTimezoneOption("America/New_York")?.label).toBe("New York");
    expect(findTimezoneOption("Asia/Kolkata")?.label).toBe("India");
    expect(findTimezoneOption("Europe/London")?.label).toBe("United Kingdom");
  });

  it("only accepts timezone IDs from the picker list", () => {
    expect(TIMEZONE_OPTIONS.length).toBeGreaterThan(5);
    expect(isSupportedTimezone("Asia/Kolkata")).toBe(true);
    expect(isSupportedTimezone("India")).toBe(false);
  });
});
