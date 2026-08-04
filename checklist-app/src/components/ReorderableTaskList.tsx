import { Fragment, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Dimensions, PanResponder, View } from "react-native";
import type {
  GestureResponderHandlers,
  LayoutChangeEvent,
  PanResponderGestureState,
  ScrollView,
  ViewStyle,
} from "react-native";
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
const EDGE_SCROLL_ZONE = 86;
const EDGE_SCROLL_STEP = 28;

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
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    scrollOffsetRef.current = scrollOffsetY;
  }, [scrollOffsetY]);

  const beginDrag = (task: Task, index: number) => {
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
    const middleY = currentDragState.startMiddleY + gesture.dy + scrollDelta;
    const targetIndex = findTargetIndex(currentDragState.layouts, middleY);

    maybeAutoScroll(gesture.moveY, scrollViewRef, scrollOffsetRef.current);

    if (targetIndex === currentDragState.targetIndex) return;

    const nextDragState = { ...currentDragState, targetIndex };
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  };

  const finishDrag = () => {
    const completedDragState = dragStateRef.current;
    dragStateRef.current = null;
    setDragState(null);

    if (!completedDragState || completedDragState.targetIndex === completedDragState.startIndex) {
      return;
    }

    void onMoveTask(completedDragState.taskId, completedDragState.targetIndex);
  };

  const cancelDrag = () => {
    dragStateRef.current = null;
    setDragState(null);
  };

  const displayedTasks = dragState ? movePreview(tasks, dragState.taskId, dragState.targetIndex) : tasks;

  return (
    <View style={style}>
      {displayedTasks.map((task, index) => (
        <Fragment key={task.id}>
          {renderTask(task, {
            dragHandleProps: createDragHandleProps(task, index, tasks.length, beginDrag, updateDrag, finishDrag, cancelDrag),
            index,
            isDragging: dragState?.taskId === task.id,
            onLayout: (event) => {
              rowLayouts.current.set(task.id, event.nativeEvent.layout);
            },
          })}
        </Fragment>
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
    onMoveShouldSetPanResponder: (_event, gesture) => taskCount > 1 && Math.abs(gesture.dy) > 3,
    onPanResponderGrant: () => beginDrag(task, index),
    onPanResponderMove: (_event, gesture) => updateDrag(gesture),
    onPanResponderRelease: finishDrag,
    onPanResponderTerminate: cancelDrag,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }).panHandlers;
}

function findTargetIndex(layouts: DragLayout[], middleY: number): number {
  if (layouts.length === 0) return 0;

  const target = layouts.find((layout) => middleY < layout.y + layout.height / 2);
  return target ? target.index : layouts.length - 1;
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

function movePreview(tasks: Task[], taskId: string, targetIndex: number): Task[] {
  const currentIndex = tasks.findIndex((task) => task.id === taskId);
  if (currentIndex < 0 || currentIndex === targetIndex) return tasks;

  const nextTasks = [...tasks];
  const [task] = nextTasks.splice(currentIndex, 1);
  if (!task) return tasks;

  nextTasks.splice(Math.max(0, Math.min(targetIndex, nextTasks.length)), 0, task);
  return nextTasks;
}
