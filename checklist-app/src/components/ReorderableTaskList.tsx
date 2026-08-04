import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Animated, Dimensions, PanResponder, StyleSheet, View } from "react-native";
import type {
  GestureResponderHandlers,
  LayoutChangeEvent,
  PanResponderGestureState,
  ScrollView,
  StyleProp,
  ViewStyle,
} from "react-native";
import { getStableDragTargetIndex } from "../domain/dragTarget";
import type { Task } from "../domain/types";

type RowLayout = {
  y: number;
  height: number;
};

type DragLayout = RowLayout & {
  taskId: string;
  index: number;
};

type DragState = {
  taskId: string;
  startIndex: number;
  targetIndex: number;
  activeHeight: number;
  startMiddleY: number;
  startScrollY: number;
  layouts: DragLayout[];
};

type RenderTaskOptions = {
  dragHandleProps: GestureResponderHandlers;
  index: number;
  isDragging: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
};

type ReorderableTaskListProps = {
  tasks: Task[];
  onMoveTask: (taskId: string, targetIndex: number) => Promise<void> | void;
  renderTask: (task: Task, options: RenderTaskOptions) => ReactNode;
  scrollOffsetY?: number;
  scrollViewRef?: RefObject<ScrollView | null>;
  style?: ViewStyle;
};

const FALLBACK_ROW_HEIGHT = 70;
const EDGE_SCROLL_ZONE = 68;
const EDGE_SCROLL_STEP = 14;

export function ReorderableTaskList({
  tasks,
  onMoveTask,
  renderTask,
  scrollOffsetY = 0,
  scrollViewRef,
  style,
}: ReorderableTaskListProps) {
  const rowLayouts = useRef(new Map<string, RowLayout>());
  const dragStateRef = useRef<DragState | null>(null);
  const scrollOffsetRef = useRef(scrollOffsetY);
  const dragOffsetY = useRef(new Animated.Value(0)).current;
  const shiftValues = useRef(new Map<string, Animated.Value>());
  const [dragState, setDragState] = useState<DragState | null>(null);

  const getShiftValue = useCallback((taskId: string) => {
    const existing = shiftValues.current.get(taskId);
    if (existing) return existing;

    const nextValue = new Animated.Value(0);
    shiftValues.current.set(taskId, nextValue);
    return nextValue;
  }, []);

  useEffect(() => {
    scrollOffsetRef.current = scrollOffsetY;
  }, [scrollOffsetY]);

  useEffect(() => {
    const taskIds = new Set(tasks.map((task) => task.id));
    shiftValues.current.forEach((_value, taskId) => {
      if (!taskIds.has(taskId)) shiftValues.current.delete(taskId);
    });

    tasks.forEach((task, index) => {
      const targetShift = dragState && task.id !== dragState.taskId ? getNeighborShift(index, dragState) : 0;
      Animated.spring(getShiftValue(task.id), {
        toValue: targetShift,
        useNativeDriver: true,
        stiffness: 320,
        damping: 34,
        mass: 0.8,
        restDisplacementThreshold: 0.4,
        restSpeedThreshold: 0.4,
      }).start();
    });
  }, [dragState, getShiftValue, tasks]);

  const beginDrag = (task: Task, index: number) => {
    dragOffsetY.setValue(0);

    const layouts = tasks.map((candidate, candidateIndex) => {
      const layout = rowLayouts.current.get(candidate.id) ?? {
        y: candidateIndex * FALLBACK_ROW_HEIGHT,
        height: FALLBACK_ROW_HEIGHT,
      };

      return { ...layout, taskId: candidate.id, index: candidateIndex };
    });
    const taskLayout = layouts.find((layout) => layout.taskId === task.id) ?? {
      taskId: task.id,
      index,
      y: index * FALLBACK_ROW_HEIGHT,
      height: FALLBACK_ROW_HEIGHT,
    };
    const activeHeight = Math.max(1, taskLayout.height);
    const nextDragState = {
      taskId: task.id,
      startIndex: index,
      targetIndex: index,
      activeHeight,
      startMiddleY: taskLayout.y + taskLayout.height / 2,
      startScrollY: scrollOffsetRef.current,
      layouts,
    };

    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  };

  const updateDrag = (gesture: PanResponderGestureState) => {
    const currentDragState = dragStateRef.current;
    if (!currentDragState) return;

    const scrollDelta = scrollOffsetRef.current - currentDragState.startScrollY;
    const dragY = gesture.dy + scrollDelta;
    const middleY = currentDragState.startMiddleY + dragY;
    const targetIndex = getStableDragTargetIndex(
      currentDragState.layouts,
      middleY,
      currentDragState.targetIndex,
    );

    dragOffsetY.setValue(dragY);
    maybeAutoScroll(gesture.moveY, scrollViewRef, scrollOffsetRef.current);

    if (targetIndex === currentDragState.targetIndex) return;

    const nextDragState = { ...currentDragState, targetIndex };
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  };

  const finishDrag = () => {
    const completedDragState = dragStateRef.current;
    dragStateRef.current = null;
    dragOffsetY.setValue(0);

    if (!completedDragState || completedDragState.targetIndex === completedDragState.startIndex) {
      setDragState(null);
      return;
    }

    void onMoveTask(completedDragState.taskId, completedDragState.targetIndex);
    setDragState(null);
  };

  const cancelDrag = () => {
    dragStateRef.current = null;
    dragOffsetY.setValue(0);
    setDragState(null);
  };

  return (
    <View style={style}>
      {tasks.map((task, index) => (
        <Animated.View key={task.id} style={getDragItemStyle(task.id, dragState, dragOffsetY, getShiftValue(task.id))}>
          <Fragment>
            {renderTask(task, {
              dragHandleProps: createDragHandleProps(task, index, tasks.length, beginDrag, updateDrag, finishDrag, cancelDrag),
              index,
              isDragging: dragState?.taskId === task.id,
              onLayout: (event) => {
                rowLayouts.current.set(task.id, event.nativeEvent.layout);
              },
            })}
          </Fragment>
        </Animated.View>
      ))}
    </View>
  );
}

function createDragHandleProps(
  task: Task,
  index: number,
  taskCount: number,
  beginDrag: (task: Task, index: number) => void,
  updateDrag: (gesture: PanResponderGestureState) => void,
  finishDrag: () => void,
  cancelDrag: () => void,
): GestureResponderHandlers {
  return PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) =>
      taskCount > 1 && Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15,
    onPanResponderGrant: () => beginDrag(task, index),
    onPanResponderMove: (_event, gesture) => updateDrag(gesture),
    onPanResponderRelease: finishDrag,
    onPanResponderTerminate: cancelDrag,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }).panHandlers;
}

function getDragItemStyle(
  taskId: string,
  dragState: DragState | null,
  dragOffsetY: Animated.Value,
  shiftY: Animated.Value,
): StyleProp<ViewStyle> {
  if (!dragState) return [styles.item, { transform: [{ translateY: shiftY }] }];

  if (taskId === dragState.taskId) {
    return [styles.item, styles.draggedItem, { transform: [{ translateY: dragOffsetY }, { scale: 1.012 }] }];
  }

  return [styles.item, styles.shiftedItem, { transform: [{ translateY: shiftY }] }];
}

function getNeighborShift(index: number, dragState: DragState): number {
  if (dragState.targetIndex > dragState.startIndex && index > dragState.startIndex && index <= dragState.targetIndex) {
    return -dragState.activeHeight;
  }

  if (dragState.targetIndex < dragState.startIndex && index >= dragState.targetIndex && index < dragState.startIndex) {
    return dragState.activeHeight;
  }

  return 0;
}

function maybeAutoScroll(
  moveY: number,
  scrollViewRef: RefObject<ScrollView | null> | undefined,
  currentScrollOffset: number,
) {
  const scrollView = scrollViewRef?.current;
  if (!scrollView) return;

  const viewportHeight = Dimensions.get("window").height;
  if (moveY < EDGE_SCROLL_ZONE) {
    scrollView.scrollTo({ y: Math.max(0, currentScrollOffset - EDGE_SCROLL_STEP), animated: false });
    return;
  }

  if (moveY > viewportHeight - EDGE_SCROLL_ZONE) {
    scrollView.scrollTo({ y: currentScrollOffset + EDGE_SCROLL_STEP, animated: false });
  }
}

const webSlideStyle = {
  transitionDuration: "120ms",
  transitionProperty: "transform",
  transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
} as ViewStyle;

const styles = StyleSheet.create({
  item: {
    position: "relative",
  },
  draggedItem: {
    zIndex: 20,
    elevation: 8,
  },
  shiftedItem: webSlideStyle,
});
