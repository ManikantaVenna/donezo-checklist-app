import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../components/AppButton";
import {
  DEFAULT_TIMEZONE,
  filterTimezoneOptions,
  findTimezoneOption,
  formatClockInTimezone,
  formatNextResetInTimezone,
  isSupportedTimezone,
  supportedTimezoneOrDefault,
} from "../domain/timezones";
import { useChecklist } from "../state/ChecklistContext";
import { colors, fontFamily, radii } from "../theme/tokens";

type SettingsScreenProps = {
  accountEmail?: string | null;
  usingDemoMode?: boolean;
  onSignOut?: () => Promise<void>;
};

export function SettingsScreen({ accountEmail = null, usingDemoMode = true, onSignOut }: SettingsScreenProps) {
  const { snapshot, loading, error, updateReminderPreference, updateTimezone } = useChecklist();
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("23:00");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewNow, setPreviewNow] = useState(() => new Date());
  const [timezonePickerOpen, setTimezonePickerOpen] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");

  useEffect(() => {
    if (!snapshot) return;

    setTimezone(supportedTimezoneOrDefault(snapshot.timezone));
    setReminderEnabled(snapshot.reminderPreferences.enabled);
    setReminderTime(snapshot.reminderPreferences.reminderTime || "23:00");
  }, [snapshot]);

  useEffect(() => {
    const interval = setInterval(() => setPreviewNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

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
    const trimmedReminderTime = reminderTime.trim();

    if (!isSupportedTimezone(timezone)) {
      setFormError("Choose a timezone from the list.");
      return;
    }

    if (!isValidReminderTime(trimmedReminderTime)) {
      setFormError("Use 24-hour time like 23:00 for 11 PM.");
      return;
    }

    setBusy(true);
    setFormError(null);
    await updateTimezone(timezone);
    await updateReminderPreference(reminderEnabled, trimmedReminderTime);
    setBusy(false);
  };

  const formattedReminderTime = reminderEnabled ? formatReminderTime(reminderTime) : "Off";
  const selectedTimezone = findTimezoneOption(timezone);
  const filteredTimezones = filterTimezoneOptions(timezoneSearch);

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
        <View style={styles.resetPreview}>
          <Text style={styles.previewTitle}>{selectedTimezone?.label ?? "New York"}</Text>
          <Text style={styles.previewClock}>{formatClockInTimezone(previewNow, timezone)}</Text>
          <Text style={styles.previewDetail}>Next daily reset: {formatNextResetInTimezone(previewNow, timezone)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={timezonePickerOpen ? "Hide timezone picker" : "Change timezone"}
          onPress={() => setTimezonePickerOpen((open) => !open)}
          style={({ pressed }) => [styles.timezonePickerButton, pressed && styles.pressed]}
        >
          <View style={styles.timezonePickerCopy}>
            <Text style={styles.timezonePickerTitle}>Selected timezone</Text>
            <Text style={styles.timezonePickerValue}>{selectedTimezone?.label ?? "New York"} · {timezone}</Text>
          </View>
          <Text style={styles.timezonePickerAction}>{timezonePickerOpen ? "Hide" : "Change"}</Text>
        </Pressable>
        {timezonePickerOpen ? (
          <View style={styles.timezonePickerPanel}>
            <TextInput
              accessibilityLabel="Search timezones"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setTimezoneSearch}
              placeholder="Search city, country, or timezone..."
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={timezoneSearch}
            />
            <View style={styles.timezoneGrid}>
              {filteredTimezones.map((option) => {
                const selected = option.id === timezone;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${option.label} timezone`}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setTimezone(option.id);
                      setFormError(null);
                      setTimezonePickerOpen(false);
                      setTimezoneSearch("");
                    }}
                    style={({ pressed }) => [
                      styles.timezoneOption,
                      selected && styles.timezoneOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.timezoneName, selected && styles.timezoneNameSelected]}>{option.label}</Text>
                    <Text style={styles.timezoneRegion}>{option.region}</Text>
                    <Text style={styles.timezoneId}>{option.id}</Text>
                    <Text style={[styles.timezoneClock, selected && styles.timezoneClockSelected]}>
                      {formatClockInTimezone(previewNow, option.id)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {filteredTimezones.length === 0 ? (
              <Text style={styles.emptyTimezoneCopy}>No matching timezone. Try a city like London, India, or Tokyo.</Text>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.detail}>Daily tasks reset at 12:00 AM in the selected timezone.</Text>
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
            ? "Sign-up and cross-device sync appear when Donezo cloud sync is connected."
            : "Your tasks sync privately through your Donezo account."}
        </Text>
        {!usingDemoMode && onSignOut ? (
          <View style={styles.signOut}>
            <AppButton label="Sign out" onPress={onSignOut} tone="ghost" />
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.panel}>
        <Text style={styles.label}>DONEZO 1.0.0</Text>
        <Text style={styles.detail}>Simple, private checklists that stay synced across your devices.</Text>
        <View style={styles.aboutLinks}>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL("https://donezo.mv-builds.com/privacy")}
            style={({ pressed }) => [styles.aboutLink, pressed && styles.pressed]}
          >
            <Text style={styles.aboutLinkText}>Privacy policy</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL("https://donezo.mv-builds.com/support")}
            style={({ pressed }) => [styles.aboutLink, pressed && styles.pressed]}
          >
            <Text style={styles.aboutLinkText}>Support</Text>
          </Pressable>
        </View>
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
  resetPreview: {
    marginTop: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.accentTint,
    padding: 13,
  },
  previewTitle: {
    color: colors.text,
    fontFamily: fontFamily.black,
    fontSize: 15,
  },
  previewClock: {
    marginTop: 6,
    color: colors.accentSoft,
    fontFamily: fontFamily.black,
    fontSize: 26,
    lineHeight: 31,
  },
  previewDetail: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  timezonePickerButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    padding: 12,
  },
  timezonePickerCopy: {
    flex: 1,
    minWidth: 0,
  },
  timezonePickerTitle: {
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  timezonePickerValue: {
    marginTop: 5,
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  timezonePickerAction: {
    overflow: "hidden",
    borderRadius: radii.pill,
    backgroundColor: colors.accentTint,
    color: colors.accentSoft,
    fontFamily: fontFamily.black,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timezonePickerPanel: {
    marginTop: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.025)",
    padding: 10,
  },
  timezoneGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  timezoneOption: {
    minWidth: 142,
    flexGrow: 1,
    flexBasis: "47%",
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    padding: 11,
  },
  timezoneOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentTint,
  },
  timezoneName: {
    color: colors.text,
    fontFamily: fontFamily.black,
    fontSize: 13,
  },
  timezoneNameSelected: {
    color: colors.accentSoft,
  },
  timezoneRegion: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 11,
  },
  timezoneId: {
    marginTop: 5,
    color: colors.muted,
    fontFamily: fontFamily.medium,
    fontSize: 10,
  },
  timezoneClock: {
    marginTop: 8,
    color: colors.text,
    fontFamily: fontFamily.black,
    fontSize: 13,
  },
  timezoneClockSelected: {
    color: colors.accentSoft,
  },
  emptyTimezoneCopy: {
    marginTop: 10,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
  },
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
  aboutLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  aboutLink: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.accentTint,
    paddingHorizontal: 14,
  },
  aboutLinkText: {
    color: colors.accentSoft,
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.78,
  },
});

export default SettingsScreen;
