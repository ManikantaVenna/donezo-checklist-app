import { describe, expect, it } from "vitest";
import { contentRange, getReleaseKey, parseRangeHeader } from "./release";

describe("release worker routing", () => {
  it("allows only Donezo APK release paths", () => {
    expect(getReleaseKey("/android/Donezo-1.0.7-build-10.apk")).toBe("android/Donezo-1.0.7-build-10.apk");
    expect(getReleaseKey("/android/other.apk")).toBeNull();
    expect(getReleaseKey("/android/Donezo-1.0.7.apk")).toBeNull();
    expect(getReleaseKey("/releases/android/latest.json")).toBeNull();
  });
});

describe("range parsing", () => {
  it("supports normal, open-ended, and suffix ranges", () => {
    expect(parseRangeHeader("bytes=10-19", 100)).toEqual({ offset: 10, length: 10 });
    expect(parseRangeHeader("bytes=10-", 100)).toEqual({ offset: 10 });
    expect(parseRangeHeader("bytes=-25", 100)).toEqual({ suffix: 25 });
  });

  it("rejects malformed or unsatisfiable ranges", () => {
    expect(parseRangeHeader("items=0-1", 100)).toBe("invalid");
    expect(parseRangeHeader("bytes=99-10", 100)).toBe("invalid");
    expect(parseRangeHeader("bytes=100-", 100)).toBe("invalid");
  });

  it("formats content ranges", () => {
    expect(contentRange({ offset: 10, length: 10 }, 100)).toBe("bytes 10-19/100");
    expect(contentRange({ offset: 10 }, 100)).toBe("bytes 10-99/100");
    expect(contentRange({ suffix: 25 }, 100)).toBe("bytes 75-99/100");
  });
});
