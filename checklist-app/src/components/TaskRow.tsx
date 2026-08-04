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
        accessibilityHint="Hold and drag to move this task."
        accessibilityLabel={`Reorder ${task.title}`}
        accessibilityRole="button"
        style={styles.dragHandle}
        {...dragHandleProps}
      >
        <GripIcon />
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

function GripIcon() {
  return (
    <View style={styles.gripDots}>
      <View style={styles.gripDotRow}>
        <View style={styles.gripDot} />
        <View style={styles.gripDot} />
      </View>
      <View style={styles.gripDotRow}>
        <View style={styles.gripDot} />
        <View style={styles.gripDot} />
      </View>
      <View style={styles.gripDotRow}>
        <View style={styles.gripDot} />
        <View style={styles.gripDot} />
      </View>
    </View>
  );
}

function TrashIcon() {
  return (
    <View accessible={false} style={styles.trashIcon}>
      <View style={styles.trashLid} />
      <View style={styles.trashCan}>
        <View style={styles.trashLine} />
        <View style={styles.trashLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
  },
  rowDragging: {
    borderColor: "rgba(221,179,79,0.54)",
    backgroundColor: colors.panel3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 4,
  },
  dragHandle: {
    width: 30,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.card,
  },
  gripDots: {
    gap: 3,
  },
  gripDotRow: {
    flexDirection: "row",
    gap: 3,
  },
  gripDot: {
    width: 3,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: "#727B8C",
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
    gap: 5,
  },
  deleteButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(242,109,95,0.24)",
    backgroundColor: "rgba(242,109,95,0.08)",
  },
  trashIcon: {
    width: 16,
    height: 17,
    alignItems: "center",
  },
  trashLid: {
    width: 13,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.danger,
  },
  trashCan: {
    width: 11,
    height: 13,
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "center",
    gap: 3,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: colors.danger,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    paddingTop: 2,
  },
  trashLine: {
    width: 1,
    height: 8,
    borderRadius: 1,
    backgroundColor: colors.danger,
  },
});
