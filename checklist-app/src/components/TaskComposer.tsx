import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { CreateTaskInput } from "../data/checklistRepository";
import type { TaskType } from "../domain/types";
import { colors, fontFamily, radii } from "../theme/tokens";
import { AppButton } from "./AppButton";

type TaskComposerProps = {
  label: string;
  placeholder: string;
  defaultType: TaskType;
  types?: TaskType[];
  projectId?: string | null;
  compact?: boolean;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
};

const taskTypeLabels: Record<TaskType, string> = {
  quick: "Quick",
  daily: "Daily",
  project: "Project",
};

export function TaskComposer({
  label,
  placeholder,
  defaultType,
  types = [defaultType],
  projectId = null,
  compact = false,
  onSubmit,
}: TaskComposerProps) {
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<TaskType>(defaultType);
  const [busy, setBusy] = useState(false);
  const trimmedTitle = title.trim();

  const submitTask = async () => {
    if (!trimmedTitle || busy) return;

    const submittedTitle = trimmedTitle;
    setTitle("");
    setBusy(true);
    try {
      await onSubmit({
        title: submittedTitle,
        type: taskType,
        projectId: taskType === "project" ? projectId : null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel={placeholder}
          onChangeText={setTitle}
          onSubmitEditing={submitTask}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          style={styles.input}
          value={title}
        />
        <AppButton label={busy ? "Adding..." : "Add"} onPress={submitTask} disabled={!trimmedTitle || busy} />
      </View>
      {types.length > 1 ? (
        <View accessibilityRole="radiogroup" style={styles.segmented}>
          {types.map((type) => {
            const selected = type === taskType;
            return (
              <Pressable
                key={type}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setTaskType(type)}
                style={({ pressed }) => [
                  styles.segment,
                  selected && styles.segmentSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{taskTypeLabels[type]}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 22,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: 12,
  },
  compactCard: {
    marginTop: 10,
    padding: 10,
  },
  label: {
    marginBottom: 9,
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  input: {
    minHeight: 48,
    flex: 1,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    color: colors.text,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    paddingHorizontal: 13,
  },
  segmented: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  segment: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    paddingHorizontal: 14,
  },
  segmentSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentTint,
  },
  segmentText: {
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  segmentTextSelected: {
    color: colors.accentSoft,
  },
  pressed: {
    opacity: 0.78,
  },
});
