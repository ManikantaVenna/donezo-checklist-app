import { StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radii } from "../theme/tokens";

type ProgressCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function ProgressCard({ label, value, detail }: ProgressCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 92,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: 14,
  },
  label: {
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 11,
    textTransform: "uppercase",
  },
  value: {
    marginTop: 10,
    color: colors.text,
    fontFamily: fontFamily.black,
    fontSize: 28,
    lineHeight: 30,
  },
  detail: {
    marginTop: 7,
    color: colors.accentSoft,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
});
