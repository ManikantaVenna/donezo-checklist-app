import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radii } from "../theme/tokens";

type TaskUndoToastProps = {
  taskTitle: string;
  onUndo: () => void;
};

export function TaskUndoToast({ taskTitle, onUndo }: TaskUndoToastProps) {
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <View style={styles.toast}>
        <View style={styles.copy}>
          <Text style={styles.title}>Task deleted</Text>
          <Text numberOfLines={1} style={styles.detail}>
            {taskTitle}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Undo delete ${taskTitle}`}
          onPress={onUndo}
          style={({ pressed }) => [styles.undoButton, pressed && styles.pressed]}
        >
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    right: 20,
    bottom: 14,
    left: 20,
    alignItems: "center",
  },
  toast: {
    width: "100%",
    maxWidth: 520,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.panel3,
    paddingVertical: 10,
    paddingRight: 10,
    paddingLeft: 14,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 6,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  detail: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 12,
  },
  undoButton: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(221,179,79,0.52)",
    backgroundColor: colors.accentTint,
    paddingHorizontal: 15,
  },
  undoText: {
    color: colors.accentSoft,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.78,
  },
});
