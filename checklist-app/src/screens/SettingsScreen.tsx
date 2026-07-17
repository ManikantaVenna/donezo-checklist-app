import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useChecklist } from "../state/ChecklistContext";
import { colors, fontFamily, radii } from "../theme/tokens";

export function SettingsScreen() {
  const { snapshot } = useChecklist();
  const timezone = snapshot?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const reminderEnabled = snapshot?.reminderPreferences.enabled ?? false;

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.eyebrow}>PREFERENCES</Text>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subcopy}>Keep your checklist aligned with your day.</Text>

      <Text style={styles.sectionTitle}>Schedule</Text>
      <View style={styles.panel}>
        <Text style={styles.label}>TIMEZONE</Text>
        <Text style={styles.value}>{timezone}</Text>
        <Text style={styles.detail}>Local midnight reset - 11:00 PM reminder</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>DAILY REMINDER</Text>
        <Text style={styles.value}>{reminderEnabled ? "Enabled" : "Off"}</Text>
        <Text style={[styles.detail, reminderEnabled && styles.enabled]}>
          {reminderEnabled ? "A reminder is scheduled for your local evening." : "Turn on a reminder when you need a nudge."}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 36 },
  eyebrow: { color: colors.amber, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.4 },
  title: { marginTop: 8, color: colors.text, fontFamily: fontFamily.black, fontSize: 32, lineHeight: 38 },
  subcopy: { marginTop: 7, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  sectionTitle: { marginTop: 30, marginBottom: 11, color: colors.text, fontFamily: fontFamily.black, fontSize: 16 },
  panel: { marginBottom: 10, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, padding: 16 },
  label: { color: colors.muted, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.1 },
  value: { marginTop: 9, color: colors.text, fontFamily: fontFamily.bold, fontSize: 16 },
  detail: { marginTop: 6, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18 },
  enabled: { color: colors.green },
});

export default SettingsScreen;
