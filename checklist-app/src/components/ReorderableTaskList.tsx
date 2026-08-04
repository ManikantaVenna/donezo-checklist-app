import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Animated, Dimensions, PanResponder, StyleSheet, View } from "react-native";
import type {
  GestureResponderHandlers,
  LayoutChangeEvent,
  PanResponderGestureState,
  ScrollView,
  StyleProp,
  ViewStyle,
} from "react-native";
import { getEdgeAutoScrollDelta, getStableDragTargetIndex } from "../domain/dragTarget";
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
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    scrollOffsetRef.current = scrollOffsetY;
  }, [scrollOffsetY]);

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
    const nextDragState = {
      taskId: task.id,
      startIndex: index,
      targetIndex: index,
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

    dragStateRef.current = { ...currentDragState, targetIndex };
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
        <Animated.View key={task.id} style={getDragItemStyle(task.id, dragState, dragOffsetY)}>
          {renderTask(task, {
            dragHandleProps: createDragHandleProps(task, index, tasks.length, beginDrag, updateDrag, finishDrag, cancelDrag),
            index,
            isDragging: dragState?.taskId === task.id,
            onLayout: (event) => {
              rowLayouts.current.set(task.id, event.nativeEvent.layout);
            },
          })}
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
    onStartShouldSetPanResponder: () => taskCount > 1,
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
): StyleProp<ViewStyle> {
  if (!dragState) return styles.item;

  if (taskId === dragState.taskId) {
    return [styles.item, styles.draggedItem, { transform: [{ translateY: dragOffsetY }, { scale: 1.012 }] }];
  }

  return styles.item;
}

function maybeAutoScroll(
  moveY: number,
  scrollViewRef: RefObject<ScrollView | null> | undefined,
  currentScrollOffset: number,
) {
  const scrollView = scrollViewRef?.current;
  if (!scrollView) return;

  const viewportHeight = Dimensions.get("window").height;
  const scrollDelta = getEdgeAutoScrollDelta(moveY, viewportHeight);
  if (scrollDelta === 0) return;

  scrollView.scrollTo({ y: Math.max(0, currentScrollOffset + scrollDelta), animated: false });
}

const styles = StyleSheet.create({
  item: {
    position: "relative",
  },
  draggedItem: {
    zIndex: 20,
    elevation: 8,
  },
});
