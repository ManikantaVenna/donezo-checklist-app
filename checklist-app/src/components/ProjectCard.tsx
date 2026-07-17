import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radii } from "../theme/tokens";

type ProjectCardProps = {
  name: string;
  remaining: number;
  percent: number;
  onPress: () => void;
};

export function ProjectCard({ name, remaining, percent, onPress }: ProjectCardProps) {
  const clampedPercent = Math.max(0, Math.min(percent, 100));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${remaining} tasks left, ${clampedPercent}% complete`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>{name}</Text>
          <Text style={styles.meta}>{remaining} tasks left</Text>
        </View>
        <Text style={styles.badge}>{clampedPercent}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clampedPercent}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    padding: 13,
  },
  pressed: {
    opacity: 0.82,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  meta: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 11,
  },
  badge: {
    overflow: "hidden",
    borderRadius: radii.pill,
    backgroundColor: "rgba(88,231,189,0.1)",
    color: colors.green,
    fontFamily: fontFamily.black,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  track: {
    height: 6,
    marginTop: 13,
    overflow: "hidden",
    borderRadius: radii.pill,
    backgroundColor: "#252B37",
  },
  fill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.blue,
  },
});
