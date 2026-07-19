import { describe, expect, it } from "vitest";
import { getStreakTier, isTierBoundary } from "./streakTiers";

describe("getStreakTier", () => {
  const cases = [
    [0, "neutral"], [1, "silver"], [14, "silver"],
    [15, "rose-gold"], [29, "rose-gold"], [30, "gold"], [44, "gold"],
    [45, "diamond"], [59, "diamond"], [60, "emerald"], [74, "emerald"],
    [75, "sapphire"], [89, "sapphire"], [90, "black-diamond"],
    [99, "black-diamond"], [100, "legend"], [145, "legend"],
  ] as const;

  it.each(cases)("maps %i to %s", (streak, id) => {
    expect(getStreakTier(streak).id).toBe(id);
  });
});

describe("isTierBoundary", () => {
  it("recognizes only earned-tier boundaries", () => {
    expect([1, 15, 30, 45, 60, 75, 90, 100].filter(isTierBoundary)).toEqual([1, 15, 30, 45, 60, 75, 90, 100]);
    expect(isTierBoundary(14)).toBe(false);
    expect(isTierBoundary(101)).toBe(false);
  });
});
