import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Task } from "../domain/types";
import { colors, fontFamily, radii } from "../theme/tokens";

type TaskRowProps = {
  task: Task;
  complete: boolean;
  streak?: number;
  meta?: string;
  onToggle: () => void;
};

export function TaskRow({ task, complete, streak, meta, onToggle }: TaskRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={task.title}
      accessibilityState={{ checked: complete }}
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.check, complete && styles.checkComplete]}>
        {complete ? <Text style={styles.checkText}>✓</Text> : null}
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, complete && styles.done]}>
          {task.title}
        </Text>
        {meta ? <Text numberOfLines={1} style={styles.meta}>{meta}</Text> : null}
      </View>
      {typeof streak === "number" ? <Text style={styles.badge}>{streak}d</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
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
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  checkText: {
    color: "#06110F",
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
    textDecorationColor: colors.green,
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
    backgroundColor: "rgba(88,231,189,0.1)",
    color: colors.green,
    fontFamily: fontFamily.black,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: "center",
  },
});
