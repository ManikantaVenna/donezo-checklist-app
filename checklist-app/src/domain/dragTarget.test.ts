import { describe, expect, it } from "vitest";
import { getStableDragTargetIndex, type DragTargetLayout } from "./dragTarget";

const layouts: DragTargetLayout[] = [
  { index: 0, y: 0, height: 60 },
  { index: 1, y: 68, height: 60 },
  { index: 2, y: 136, height: 60 },
];

describe("getStableDragTargetIndex", () => {
  it("waits past a lower threshold before moving down", () => {
    expect(getStableDragTargetIndex(layouts, 100, 0)).toBe(0);
    expect(getStableDragTargetIndex(layouts, 104, 0)).toBe(1);
  });

  it("keeps the current target while hovering inside the dead zone", () => {
    expect(getStableDragTargetIndex(layouts, 92, 1)).toBe(1);
    expect(getStableDragTargetIndex(layouts, 86, 1)).toBe(0);
  });

  it("can move through more than one row when the drag travels far enough", () => {
    expect(getStableDragTargetIndex(layouts, 174, 0)).toBe(2);
  });
});
