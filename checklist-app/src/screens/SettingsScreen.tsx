import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { useChecklist } from "../state/ChecklistContext";
import { colors, fontFamily, radii } from "../theme/tokens";

type SettingsScreenProps = {
  accountEmail?: string | null;
  usingDemoMode?: boolean;
  onSignOut?: () => Promise<void>;
};

export function SettingsScreen({ accountEmail = null, usingDemoMode = true, onSignOut }: SettingsScreenProps) {
  const { snapshot, loading, error, updateReminderPreference, updateTimezone } = useChecklist();
  const [timezone, setTimezone] = useState("America/New_York");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("23:00");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!snapshot) return;

    setTimezone(snapshot.timezone || "America/New_York");
    setReminderEnabled(snapshot.reminderPreferences.enabled);
    setReminderTime(snapshot.reminderPreferences.reminderTime || "23:00");
  }, [snapshot]);

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

  const saveSettings = async () => {
    const trimmedTimezone = timezone.trim();
    const trimmedReminderTime = reminderTime.trim();

    if (!trimmedTimezone) {
      setFormError("Timezone cannot be empty.");
      return;
    }

    if (!isValidReminderTime(trimmedReminderTime)) {
      setFormError("Use 24-hour time like 23:00 for 11 PM.");
      return;
    }

    setBusy(true);
    setFormError(null);
    await updateTimezone(trimmedTimezone);
    await updateReminderPreference(reminderEnabled, trimmedReminderTime);
    setBusy(false);
  };

  const formattedReminderTime = reminderEnabled ? formatReminderTime(reminderTime) : "Off";

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.eyebrow}>PREFERENCES</Text>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subcopy}>Keep your checklist aligned with your day.</Text>
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
      {formError ? <Text style={styles.inlineError}>{formError}</Text> : null}

      <Text style={styles.sectionTitle}>Schedule</Text>
      <View style={styles.panel}>
        <Text style={styles.label}>TIMEZONE</Text>
        <TextInput
          accessibilityLabel="Timezone"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setTimezone}
          placeholder="America/New_York"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={timezone}
        />
        <Text style={styles.detail}>Default is America/New_York. Daily tasks reset at local midnight.</Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.label}>DAILY REMINDER</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: reminderEnabled }}
            onPress={() => setReminderEnabled((enabled) => !enabled)}
            style={({ pressed }) => [
              styles.toggle,
              reminderEnabled && styles.toggleEnabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.toggleText, reminderEnabled && styles.toggleTextEnabled]}>
              {reminderEnabled ? "On" : "Off"}
            </Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Reminder time"
          autoCapitalize="none"
          autoCorrect={false}
          editable={reminderEnabled}
          onChangeText={setReminderTime}
          placeholder="23:00"
          placeholderTextColor={colors.muted}
          style={[styles.input, !reminderEnabled && styles.inputDisabled]}
          value={reminderTime}
        />
        <Text style={[styles.detail, reminderEnabled && styles.enabled]}>
          {reminderEnabled
            ? `${formattedReminderTime} reminder. Use 24-hour time; 23:00 is 11 PM.`
            : "Turn on daily reminders when you need an end-of-day nudge."}
        </Text>
      </View>

      <AppButton label={busy ? "Saving..." : "Save settings"} onPress={saveSettings} disabled={busy} />

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.panel}>
        <Text style={styles.label}>{usingDemoMode ? "DEMO MODE" : "SIGNED IN"}</Text>
        <Text style={styles.value}>{usingDemoMode ? "Local demo account" : accountEmail ?? "Signed in"}</Text>
        <Text style={styles.detail}>
          {usingDemoMode
            ? "Sign-up and cross-device sync appear when real Supabase credentials are added."
            : "Your tasks sync through your account on this Supabase project."}
        </Text>
        {!usingDemoMode && onSignOut ? (
          <View style={styles.signOut}>
            <AppButton label="Sign out" onPress={onSignOut} tone="ghost" />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function isValidReminderTime(value: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return false;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
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
  inlineError: {
    marginTop: 16,
    borderRadius: radii.card,
    backgroundColor: "rgba(242,109,95,0.12)",
    color: colors.danger,
    fontFamily: fontFamily.medium,
    fontSize: 13,
    padding: 12,
  },
  sectionTitle: { marginTop: 30, marginBottom: 11, color: colors.text, fontFamily: fontFamily.black, fontSize: 16 },
  panel: {
    marginBottom: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: 16,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: { color: colors.muted, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.1 },
  value: { marginTop: 9, color: colors.text, fontFamily: fontFamily.bold, fontSize: 16 },
  detail: { marginTop: 8, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18 },
  enabled: { color: colors.accentSoft },
  input: {
    minHeight: 48,
    marginTop: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    color: colors.text,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    paddingHorizontal: 13,
  },
  inputDisabled: {
    opacity: 0.45,
  },
  toggle: {
    minHeight: 34,
    minWidth: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    paddingHorizontal: 14,
  },
  toggleEnabled: {
    borderColor: colors.accent,
    backgroundColor: colors.accentTint,
  },
  toggleText: {
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  toggleTextEnabled: {
    color: colors.accentSoft,
  },
  signOut: {
    marginTop: 14,
  },
  pressed: {
    opacity: 0.78,
  },
});

export default SettingsScreen;
