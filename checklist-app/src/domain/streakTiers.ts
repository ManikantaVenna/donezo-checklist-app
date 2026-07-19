export type StreakTierId =
  | "neutral" | "silver" | "rose-gold" | "gold" | "diamond"
  | "emerald" | "sapphire" | "black-diamond" | "legend";

export type StreakTier = { id: StreakTierId; label: string; minimum: number };

export const STREAK_TIERS: readonly StreakTier[] = [
  { id: "neutral", label: "No streak", minimum: 0 },
  { id: "silver", label: "Silver", minimum: 1 },
  { id: "rose-gold", label: "Rose Gold", minimum: 15 },
  { id: "gold", label: "Gold", minimum: 30 },
  { id: "diamond", label: "Diamond", minimum: 45 },
  { id: "emerald", label: "Emerald", minimum: 60 },
  { id: "sapphire", label: "Sapphire", minimum: 75 },
  { id: "black-diamond", label: "Black Diamond", minimum: 90 },
  { id: "legend", label: "Legend", minimum: 100 },
] as const;

export function getStreakTier(streak: number): StreakTier {
  const safeStreak = Math.max(0, Math.floor(streak));
  return [...STREAK_TIERS].reverse().find((tier) => safeStreak >= tier.minimum)!;
}

export function isTierBoundary(streak: number): boolean {
  return streak > 0 && STREAK_TIERS.some((tier) => tier.minimum === streak);
}
