export type DragTargetLayout = {
  index: number;
  y: number;
  height: number;
};

const DOWN_COMMIT_RATIO = 0.58;
const UP_COMMIT_RATIO = 0.32;

export function getStableDragTargetIndex(
  layouts: DragTargetLayout[],
  middleY: number,
  currentTargetIndex: number,
): number {
  if (layouts.length === 0) return 0;

  let targetIndex = Math.max(0, Math.min(currentTargetIndex, layouts.length - 1));

  while (targetIndex < layouts.length - 1) {
    const nextLayout = layouts[targetIndex + 1];
    if (!nextLayout || middleY <= nextLayout.y + nextLayout.height * DOWN_COMMIT_RATIO) break;
    targetIndex += 1;
  }

  while (targetIndex > 0) {
    const currentLayout = layouts[targetIndex];
    if (!currentLayout || middleY >= currentLayout.y + currentLayout.height * UP_COMMIT_RATIO) break;
    targetIndex -= 1;
  }

  return targetIndex;
}
