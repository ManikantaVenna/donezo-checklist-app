import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Task } from "../domain/types";
import { colors, fontFamily, radii } from "../theme/tokens";

type TaskRowProps = {
  task: Task;
  complete: boolean;
  streak?: number;
  meta?: string;
  onToggle: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
};

export function TaskRow({
  task,
  complete,
  streak,
  meta,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: TaskRowProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={task.title}
        accessibilityState={{ checked: complete }}
        onPress={onToggle}
        style={({ pressed }) => [styles.toggleArea, pressed && styles.pressed]}
      >
        <View style={[styles.check, complete && styles.checkComplete]}>
          {complete ? <Text style={styles.checkText}>✓</Text> : null}
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.title, complete && styles.done]}>
            {task.title}
          </Text>
          {meta ? (
            <Text numberOfLines={1} style={styles.meta}>
              {meta}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {typeof streak === "number" ? <Text style={styles.badge}>{streak}d</Text> : null}
      <View style={styles.actions}>
        <IconButton label={`Move ${task.title} up`} text="↑" onPress={onMoveUp} disabled={!onMoveUp || !canMoveUp} />
        <IconButton
          label={`Move ${task.title} down`}
          text="↓"
          onPress={onMoveDown}
          disabled={!onMoveDown || !canMoveDown}
        />
        {onDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${task.title}`}
            onPress={onDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function IconButton({
  label,
  text,
  onPress,
  disabled,
}: {
  label: string;
  text: string;
  onPress?: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, disabled && styles.iconButtonDisabled, pressed && styles.pressed]}
    >
      <Text style={styles.iconText}>{text}</Text>
    </Pressable>
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
  toggleArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: 10,
  },
  pressed: {
    opacity: 0.8,
  },
  check: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: "#596273",
  },
  checkComplete: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkText: {
    color: colors.black,
    fontFamily: fontFamily.black,
    fontSize: 13,
    lineHeight: 15,
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
  badge: {
    minWidth: 42,
    overflow: "hidden",
    borderRadius: radii.pill,
    backgroundColor: colors.accentTint,
    color: colors.accentSoft,
    fontFamily: fontFamily.black,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel3,
  },
  iconButtonDisabled: {
    opacity: 0.32,
  },
  iconText: {
    color: colors.text,
    fontFamily: fontFamily.black,
    fontSize: 14,
  },
  deleteButton: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(242,109,95,0.28)",
    paddingHorizontal: 9,
  },
  deleteText: {
    color: colors.danger,
    fontFamily: fontFamily.black,
    fontSize: 11,
  },
});
