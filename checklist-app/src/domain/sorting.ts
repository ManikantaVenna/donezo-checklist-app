export function sortedCopy<T>(items: readonly T[], compare: (first: T, second: T) => number): T[] {
  return Array.from(items).sort(compare);
}
