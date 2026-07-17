import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProjectCard } from "../components/ProjectCard";
import { useChecklist } from "../state/ChecklistContext";
import { colors, fontFamily } from "../theme/tokens";

export function ProjectsScreen() {
  const { snapshot, loading, error } = useChecklist();

  if (loading && !snapshot) {
    return <View style={styles.centered}><ActivityIndicator color={colors.green} /></View>;
  }

  if (!snapshot) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Projects are unavailable."}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.eyebrow}>PLANNING</Text>
      <Text style={styles.title}>Projects</Text>
      <Text style={styles.subcopy}>Move meaningful work forward, one task at a time.</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.headingRow}>
        <Text style={styles.sectionTitle}>Active projects</Text>
        <Text style={styles.count}>{snapshot.projects.length}</Text>
      </View>
      {snapshot.projects.length === 0 ? (
        <Text style={styles.emptyCopy}>No projects yet. Create one when a task needs a home.</Text>
      ) : (
        snapshot.projects.map((project) => {
          const tasks = snapshot.tasks.filter((task) => task.projectId === project.id);
          const complete = tasks.filter((task) => Boolean(task.completedAt)).length;
          return <ProjectCard key={project.id} name={project.name} remaining={tasks.length - complete} percent={tasks.length ? (complete / tasks.length) * 100 : 0} onPress={() => undefined} />;
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 36 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  eyebrow: { color: colors.blue, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.4 },
  title: { marginTop: 8, color: colors.text, fontFamily: fontFamily.black, fontSize: 32, lineHeight: 38 },
  subcopy: { marginTop: 7, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 11 },
  sectionTitle: { color: colors.text, fontFamily: fontFamily.black, fontSize: 16 },
  count: { color: colors.muted, fontFamily: fontFamily.black, fontSize: 13 },
  emptyCopy: { color: colors.muted, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  errorText: { marginTop: 16, color: colors.danger, fontFamily: fontFamily.medium, fontSize: 13 },
});

export default ProjectsScreen;
