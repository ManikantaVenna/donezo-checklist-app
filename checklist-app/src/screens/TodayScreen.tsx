import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProgressCard } from "../components/ProgressCard";
import { ProjectCard } from "../components/ProjectCard";
import { TaskComposer } from "../components/TaskComposer";
import { TaskRow } from "../components/TaskRow";
import { isCompletedOnDate } from "../domain/dates";
import { sortedCopy } from "../domain/sorting";
import type { Task } from "../domain/types";
import { getDailyStreak, useChecklist } from "../state/ChecklistContext";
import { colors, fontFamily, radii } from "../theme/tokens";

export function TodayScreen() {
  const { snapshot, todayLocalDate, loading, error, createTask, archiveTask, moveTask, toggleTask } = useChecklist();

  if (loading && !snapshot) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>Loading your checklist...</Text>
      </View>
    );
  }

  if (error && !snapshot) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Your checklist is unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!snapshot) return null;

  const dailyTasks = sortTasks(snapshot.tasks.filter((task) => task.type === "daily"));
  const quickTasks = sortTasks(snapshot.tasks.filter((task) => task.type === "quick"));
  const completedDaily = dailyTasks.filter((task) =>
    isCompletedOnDate(snapshot.dailyCompletions, task.id, todayLocalDate),
  ).length;
  const completedQuick = quickTasks.filter((task) => Boolean(task.completedAt)).length;
  const totalToday = dailyTasks.length + quickTasks.length;
  const completedToday = completedDaily + completedQuick;
  const completionPercent = totalToday === 0 ? 0 : Math.round((completedToday / totalToday) * 100);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.brandRow}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="Donezo logo"
          source={require("../../assets/donezo-logo.png")}
          style={styles.brandIcon}
        />
        <View>
          <Text style={styles.brandName}>Donezo</Text>
          <Text style={styles.brandDetail}>Personal command center</Text>
        </View>
      </View>
      <Text style={styles.eyebrow}>TODAY</Text>
      <Text style={styles.title}>Make the day count.</Text>
      <Text style={styles.subcopy}>
        {totalToday === 0 ? "Nothing queued yet." : `${completedToday} of ${totalToday} tasks complete.`}
      </Text>

      <TaskComposer
        defaultType="quick"
        label="ADD TASK"
        onSubmit={createTask}
        placeholder="Add something for today..."
        types={["quick", "daily"]}
      />

      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      <View style={styles.progressRow}>
        <ProgressCard label="Complete" value={`${completionPercent}%`} detail={`${completedToday}/${totalToday} done`} />
        <ProgressCard label="Daily" value={`${completedDaily}/${dailyTasks.length}`} detail="Routines today" />
      </View>

      <SectionTitle title="Daily routines" detail={`${dailyTasks.length} active`} />
      {dailyTasks.length === 0 ? (
        <Text style={styles.emptyCopy}>Add a routine to build your streak.</Text>
      ) : (
        dailyTasks.map((task, index) => {
          const complete = isCompletedOnDate(snapshot.dailyCompletions, task.id, todayLocalDate);
          return (
            <TaskRow
              key={task.id}
              canMoveDown={index < dailyTasks.length - 1}
              canMoveUp={index > 0}
              task={task}
              complete={complete}
              streak={getDailyStreak(snapshot, task.id, todayLocalDate)}
              meta={complete ? "Completed today" : "Keep the streak going"}
              onDelete={() => archiveTask(task.id)}
              onMoveDown={() => moveTask(task.id, "down")}
              onMoveUp={() => moveTask(task.id, "up")}
              onToggle={() => toggleTask(task)}
            />
          );
        })
      )}

      <SectionTitle title="Quick tasks" detail={`${quickTasks.filter((task) => !task.completedAt).length} open`} />
      {quickTasks.length === 0 ? (
        <Text style={styles.emptyCopy}>No quick tasks for today.</Text>
      ) : (
        quickTasks.map((task, index) => (
          <TaskRow
            key={task.id}
            canMoveDown={index < quickTasks.length - 1}
            canMoveUp={index > 0}
            task={task}
            complete={Boolean(task.completedAt)}
            meta={task.completedAt ? "Completed" : "One-time task"}
            onDelete={() => archiveTask(task.id)}
            onMoveDown={() => moveTask(task.id, "down")}
            onMoveUp={() => moveTask(task.id, "up")}
            onToggle={() => toggleTask(task)}
          />
        ))
      )}

      <SectionTitle title="Projects" detail={`${snapshot.projects.length} active`} />
      {snapshot.projects.length === 0 ? (
        <Text style={styles.emptyCopy}>Create a project to organize bigger work.</Text>
      ) : (
        snapshot.projects.map((project) => {
          const projectTasks = snapshot.tasks.filter((task) => task.projectId === project.id);
          const completeCount = projectTasks.filter((task) => Boolean(task.completedAt)).length;
          const percent = projectTasks.length === 0 ? 0 : (completeCount / projectTasks.length) * 100;
          return (
            <ProjectCard
              key={project.id}
              name={project.name}
              remaining={projectTasks.length - completeCount}
              percent={percent}
            />
          );
        })
      )}
    </ScrollView>
  );
}

function sortTasks(tasks: Task[]): Task[] {
  return sortedCopy(tasks, (first, second) => first.sortOrder - second.sortOrder || first.createdAt.localeCompare(second.createdAt));
}

function SectionTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 36 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: colors.bg },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 22,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
  },
  brandName: {
    color: colors.text,
    fontFamily: fontFamily.black,
    fontSize: 16,
    lineHeight: 20,
  },
  brandDetail: {
    marginTop: 1,
    color: colors.accentSoft,
    fontFamily: fontFamily.medium,
    fontSize: 11,
  },
  eyebrow: { color: colors.accent, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.4 },
  title: { marginTop: 8, color: colors.text, fontFamily: fontFamily.black, fontSize: 31, lineHeight: 36 },
  subcopy: { marginTop: 7, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  loadingText: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 14 },
  errorTitle: { color: colors.text, fontFamily: fontFamily.black, fontSize: 20 },
  errorText: { color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14, textAlign: "center" },
  inlineError: { marginTop: 16, borderRadius: radii.card, backgroundColor: "rgba(242,109,95,0.12)", color: colors.danger, fontFamily: fontFamily.medium, fontSize: 13, padding: 12 },
  progressRow: { flexDirection: "row", gap: 10, marginTop: 22 },
  sectionHeading: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 26, marginBottom: 10 },
  sectionTitle: { color: colors.text, fontFamily: fontFamily.black, fontSize: 16 },
  sectionDetail: { color: colors.muted, fontFamily: fontFamily.medium, fontSize: 11 },
  emptyCopy: { color: colors.muted, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
});

export default TodayScreen;
