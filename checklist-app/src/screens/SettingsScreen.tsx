import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useChecklist } from "../state/ChecklistContext";
import { colors, fontFamily, radii } from "../theme/tokens";

export function SettingsScreen() {
  const { snapshot, loading, error } = useChecklist();

  if (loading && !snapshot) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.statusText}>Loading settings...</Text>
      </View>
    );
  }

  if (!snapshot) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Your settings are unavailable</Text>
        <Text style={styles.errorText}>{error ?? "Unable to load settings."}</Text>
      </View>
    );
  }

  const { timezone, reminderPreferences } = snapshot;
  const reminderTime = reminderPreferences.enabled ? formatReminderTime(reminderPreferences.reminderTime) : "Off";

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.eyebrow}>PREFERENCES</Text>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subcopy}>Keep your checklist aligned with your day.</Text>
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>Schedule</Text>
      <View style={styles.panel}>
        <Text style={styles.label}>TIMEZONE</Text>
        <Text style={styles.value}>{timezone}</Text>
        <Text style={styles.detail}>Local midnight reset - {reminderTime} reminder</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>DAILY REMINDER</Text>
        <Text style={styles.value}>{reminderTime}</Text>
        <Text style={[styles.detail, reminderPreferences.enabled && styles.enabled]}>
          {reminderPreferences.enabled ? "A reminder is scheduled for your local evening." : "Turn on a reminder when you need a nudge."}
        </Text>
      </View>
    </ScrollView>
  );
}

function formatReminderTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return value;
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 36 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: colors.bg },
  eyebrow: { color: colors.amber, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.4 },
  title: { marginTop: 8, color: colors.text, fontFamily: fontFamily.black, fontSize: 32, lineHeight: 38 },
  subcopy: { marginTop: 7, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  statusText: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 14 },
  errorTitle: { color: colors.text, fontFamily: fontFamily.black, fontSize: 20 },
  errorText: { color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14, textAlign: "center" },
  inlineError: { marginTop: 16, borderRadius: radii.card, backgroundColor: "rgba(242,109,95,0.12)", color: colors.danger, fontFamily: fontFamily.medium, fontSize: 13, padding: 12 },
  sectionTitle: { marginTop: 30, marginBottom: 11, color: colors.text, fontFamily: fontFamily.black, fontSize: 16 },
  panel: { marginBottom: 10, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, padding: 16 },
  label: { color: colors.muted, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.1 },
  value: { marginTop: 9, color: colors.text, fontFamily: fontFamily.bold, fontSize: 16 },
  detail: { marginTop: 6, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18 },
  enabled: { color: colors.accentSoft },
});

export default SettingsScreen;
