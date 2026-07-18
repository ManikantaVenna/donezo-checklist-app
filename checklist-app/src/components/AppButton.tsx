import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontFamily, radii } from "../theme/tokens";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  tone?: "primary" | "ghost";
  disabled?: boolean;
};

export function AppButton({ label, onPress, tone = "primary", disabled = false }: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === "ghost" && styles.ghost,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
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
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.goldEdge,
    paddingHorizontal: 16,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    shadowOpacity: 0,
    elevation: 0,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: colors.black,
    fontFamily: fontFamily.black,
    fontSize: 14,
  },
  ghostLabel: {
    color: colors.text,
  },
});
