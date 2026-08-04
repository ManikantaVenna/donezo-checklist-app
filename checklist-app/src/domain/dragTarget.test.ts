import { describe, expect, it } from "vitest";
import { getEdgeAutoScrollDelta, getStableDragTargetIndex, type DragTargetLayout } from "./dragTarget";

const layouts: DragTargetLayout[] = [
  { index: 0, y: 0, height: 60 },
  { index: 1, y: 68, height: 60 },
  { index: 2, y: 136, height: 60 },
];

describe("getStableDragTargetIndex", () => {
  it("waits until the drag is clearly inside the next row before moving down", () => {
    expect(getStableDragTargetIndex(layouts, 106, 0)).toBe(0);
    expect(getStableDragTargetIndex(layouts, 108, 0)).toBe(1);
  });

  it("keeps the current target while hovering near the row boundary", () => {
    expect(getStableDragTargetIndex(layouts, 90, 1)).toBe(1);
    expect(getStableDragTargetIndex(layouts, 88, 1)).toBe(0);
  });

  it("can move through more than one row when the drag travels far enough", () => {
    expect(getStableDragTargetIndex(layouts, 178, 0)).toBe(2);
  });
});

describe("getEdgeAutoScrollDelta", () => {
  it("scrolls gently only when the pointer is close to a viewport edge", () => {
    expect(getEdgeAutoScrollDelta(50, 800)).toBe(-8);
    expect(getEdgeAutoScrollDelta(120, 800)).toBe(0);
    expect(getEdgeAutoScrollDelta(745, 800)).toBe(8);
  });
});
