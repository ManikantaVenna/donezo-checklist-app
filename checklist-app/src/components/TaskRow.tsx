import { Pressable, StyleSheet, Text, View } from "react-native";
import type { GestureResponderHandlers, LayoutChangeEvent } from "react-native";
import type { Task } from "../domain/types";
import { colors, fontFamily, radii } from "../theme/tokens";
import { StreakBadge } from "./StreakBadge";

type TaskRowProps = {
  task: Task;
  complete: boolean;
  streak?: number;
  meta?: string;
  dragHandleProps?: GestureResponderHandlers;
  isDragging?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  onToggle: () => void;
  onDelete?: () => void;
};

export function TaskRow({
  task,
  complete,
  streak,
  meta,
  dragHandleProps,
  isDragging = false,
  onLayout,
  onToggle,
  onDelete,
}: TaskRowProps) {
  return (
    <View onLayout={onLayout} style={[styles.row, isDragging && styles.rowDragging]}>
      <View
        accessible
        accessibilityHint="Drag to move this task."
        accessibilityLabel={`Reorder ${task.title}`}
        accessibilityRole="button"
        style={styles.dragHandleTouch}
        {...dragHandleProps}
      >
        <View style={[styles.dragHandle, isDragging && styles.dragHandleActive]}>
          <GripIcon active={isDragging} />
        </View>
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={task.title}
        accessibilityState={{ checked: complete }}
        onPress={onToggle}
        style={({ pressed }) => [styles.toggleArea, pressed && styles.pressed]}
      >
        <View style={styles.copy}>
          <Text style={[styles.title, complete && styles.done]}>{task.title}</Text>
          {meta ? (
            <Text numberOfLines={1} style={styles.meta}>
              {meta}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {typeof streak === "number" ? <StreakBadge streak={streak} /> : null}
      <View style={styles.actions}>
        {onDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${task.title}`}
            onPress={onDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <TrashIcon />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function GripIcon({ active }: { active: boolean }) {
  return (
    <View style={styles.gripIcon}>
      <View style={[styles.gripBar, active && styles.gripBarActive]} />
      <View style={[styles.gripBar, active && styles.gripBarActive]} />
      <View style={[styles.gripBar, active && styles.gripBarActive]} />
    </View>
  );
}

function TrashIcon() {
  const color = "#F07D70";

  return (
    <View accessible={false} style={styles.trashIcon}>
      <View style={[styles.trashHandle, { backgroundColor: color }]} />
      <View style={[styles.trashLid, { backgroundColor: color }]} />
      <View style={[styles.trashCan, { borderColor: color }]}>
        <View style={[styles.trashLine, { backgroundColor: color }]} />
        <View style={[styles.trashLine, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
    paddingVertical: 9,
    paddingRight: 9,
    paddingLeft: 8,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
  },
  rowDragging: {
    borderColor: "rgba(221,179,79,0.62)",
    backgroundColor: colors.panel3,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
  dragHandle: {
    width: 30,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(221,179,79,0.16)",
    backgroundColor: "rgba(221,179,79,0.055)",
  },
  dragHandleTouch: {
    width: 42,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandleActive: {
    borderColor: "rgba(255,226,160,0.54)",
    backgroundColor: "rgba(221,179,79,0.18)",
  },
  gripIcon: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  gripBar: {
    width: 13,
    height: 2,
    borderRadius: radii.pill,
    backgroundColor: "rgba(221,179,79,0.58)",
  },
  gripBarActive: {
    backgroundColor: colors.accentSoft,
  },
  toggleArea: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  done: {
    color: "#8D96A7",
    textDecorationLine: "line-through",
    textDecorationColor: colors.accent,
  },
  meta: {
    marginTop: 3,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 11,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(242,109,95,0.26)",
    backgroundColor: "rgba(242,109,95,0.075)",
  },
  trashIcon: {
    width: 18,
    height: 19,
    alignItems: "center",
  },
  trashHandle: {
    width: 6,
    height: 2,
    borderRadius: 2,
  },
  trashLid: {
    width: 15,
    height: 2,
    borderRadius: 2,
    marginTop: 2,
  },
  trashCan: {
    width: 13,
    height: 13,
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    paddingTop: 3,
  },
  trashLine: {
    width: 1,
    height: 7,
    borderRadius: 1,
  },
});
