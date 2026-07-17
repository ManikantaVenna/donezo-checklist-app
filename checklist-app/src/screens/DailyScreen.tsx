import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getDailyStreak, useChecklist } from "../state/ChecklistContext";
import { colors, fontFamily, radii } from "../theme/tokens";

export function DailyScreen() {
  const { snapshot, todayLocalDate } = useChecklist();
  const routines = snapshot?.tasks.filter((task) => task.type === "daily") ?? [];
  const completed = snapshot?.dailyCompletions.filter((entry) => entry.localDate === todayLocalDate).length ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.eyebrow}>ROUTINES</Text>
      <Text style={styles.title}>Daily</Text>
      <Text style={styles.subcopy}>Manage recurring routines and streaks.</Text>

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
            <Text numberOfLines={1} style={styles.routineName}>{task.title}</Text>
            <Text style={styles.streak}>{getDailyStreak(snapshot!, task.id, todayLocalDate)}d</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 36 },
  eyebrow: { color: colors.green, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.4 },
  title: { marginTop: 8, color: colors.text, fontFamily: fontFamily.black, fontSize: 32, lineHeight: 38 },
  subcopy: { marginTop: 7, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14 },
  panel: { marginTop: 28, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, padding: 18 },
  panelLabel: { color: colors.muted, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.1 },
  panelValue: { marginTop: 10, color: colors.text, fontFamily: fontFamily.black, fontSize: 34 },
  panelDetail: { marginTop: 4, color: colors.green, fontFamily: fontFamily.bold, fontSize: 12 },
  sectionTitle: { marginTop: 28, marginBottom: 11, color: colors.text, fontFamily: fontFamily.black, fontSize: 16 },
  routineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, padding: 14 },
  routineName: { flex: 1, color: colors.text, fontFamily: fontFamily.bold, fontSize: 14 },
  streak: { marginLeft: 12, borderRadius: radii.pill, backgroundColor: "rgba(88,231,189,0.1)", color: colors.green, fontFamily: fontFamily.black, fontSize: 11, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 6 },
  emptyCopy: { color: colors.muted, fontFamily: fontFamily.regular, fontSize: 13 },
});

export default DailyScreen;
