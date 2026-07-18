import { describe, expect, it } from "vitest";
import { sortedCopy } from "./sorting";

describe("sortedCopy", () => {
  it("sorts with older JavaScript runtimes and preserves the input", () => {
    const original = [3, 1, 2];

    expect(sortedCopy(original, (first, second) => first - second)).toEqual([1, 2, 3]);
    expect(original).toEqual([3, 1, 2]);
  });
});
