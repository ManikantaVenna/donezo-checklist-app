import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontFamily, radii } from "../theme/tokens";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  tone?: "primary" | "ghost";
};

export function AppButton({ label, onPress, tone = "primary" }: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, tone === "ghost" && styles.ghost, pressed && styles.pressed]}
    >
      <Text style={[styles.label, tone === "ghost" && styles.ghostLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.card,
    backgroundColor: colors.green,
    paddingHorizontal: 16,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
  },
  pressed: {
    opacity: 0.78,
  },
  label: {
    color: "#06110F",
    fontFamily: fontFamily.black,
    fontSize: 14,
  },
  ghostLabel: {
    color: colors.text,
  },
});
