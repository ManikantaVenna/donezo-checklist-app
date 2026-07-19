import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { isCompletedOnDate } from "../domain/dates";
import { getDailyStreak, useChecklist } from "../state/ChecklistContext";
import { colors, fontFamily, radii } from "../theme/tokens";
import { StreakBadge } from "../components/StreakBadge";

export function DailyScreen() {
  const { snapshot, todayLocalDate, loading, error } = useChecklist();

  if (loading && !snapshot) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.statusText}>Loading routines...</Text>
      </View>
    );
  }

  if (!snapshot) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Your routines are unavailable</Text>
        <Text style={styles.errorText}>{error ?? "Unable to load routines."}</Text>
      </View>
    );
  }

  const routines = snapshot.tasks.filter((task) => task.type === "daily");
  const completed = routines.filter((task) =>
    isCompletedOnDate(snapshot.dailyCompletions, task.id, todayLocalDate),
  ).length;

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.eyebrow}>ROUTINES</Text>
      <Text style={styles.title}>Daily</Text>
      <Text style={styles.subcopy}>Manage recurring routines and streaks.</Text>
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>TODAY</Text>
        <Text style={styles.panelValue}>{completed}/{routines.length}</Text>
        <Text style={styles.panelDetail}>routines completed</Text>
      </View>

      <Text style={styles.sectionTitle}>Your streaks</Text>
      {routines.length === 0 ? (
        <Text style={styles.emptyCopy}>Your recurring routines will appear here.</Text>
      ) : (
        routines.map((task) => (
          <View key={task.id} style={styles.routineRow}>
            <Text style={styles.routineName}>{task.title}</Text>
            <StreakBadge streak={getDailyStreak(snapshot, task.id, todayLocalDate)} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 36 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: colors.bg },
  eyebrow: { color: colors.accent, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.4 },
  title: { marginTop: 8, color: colors.text, fontFamily: fontFamily.black, fontSize: 32, lineHeight: 38 },
  subcopy: { marginTop: 7, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14 },
  statusText: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 14 },
  errorTitle: { color: colors.text, fontFamily: fontFamily.black, fontSize: 20 },
  errorText: { color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14, textAlign: "center" },
  inlineError: { marginTop: 16, borderRadius: radii.card, backgroundColor: "rgba(242,109,95,0.12)", color: colors.danger, fontFamily: fontFamily.medium, fontSize: 13, padding: 12 },
  panel: { marginTop: 28, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, padding: 18 },
  panelLabel: { color: colors.muted, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.1 },
  panelValue: { marginTop: 10, color: colors.text, fontFamily: fontFamily.black, fontSize: 34 },
  panelDetail: { marginTop: 4, color: colors.accentSoft, fontFamily: fontFamily.bold, fontSize: 12 },
  sectionTitle: { marginTop: 28, marginBottom: 11, color: colors.text, fontFamily: fontFamily.black, fontSize: 16 },
  routineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, padding: 14 },
  routineName: { flex: 1, minWidth: 0, color: colors.text, fontFamily: fontFamily.bold, fontSize: 14 },
  emptyCopy: { color: colors.muted, fontFamily: fontFamily.regular, fontSize: 13 },
});

export default DailyScreen;
