import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { ProjectCard } from "../components/ProjectCard";
import { TaskComposer } from "../components/TaskComposer";
import { TaskRow } from "../components/TaskRow";
import type { CreateProjectInput, CreateTaskInput } from "../data/checklistRepository";
import type { Project, Task } from "../domain/types";
import { useChecklist } from "../state/ChecklistContext";
import { colors, fontFamily, radii } from "../theme/tokens";

export function ProjectsScreen() {
  const { snapshot, loading, error, createProject, createTask, archiveTask, moveTask, toggleTask } = useChecklist();

  if (loading && !snapshot) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
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

      <ProjectComposer onSubmit={createProject} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.headingRow}>
        <Text style={styles.sectionTitle}>Active projects</Text>
        <Text style={styles.count}>{snapshot.projects.length}</Text>
      </View>
      {snapshot.projects.length === 0 ? (
        <Text style={styles.emptyCopy}>No projects yet. Create one when a task needs a home.</Text>
      ) : (
        snapshot.projects.map((project) => {
          const tasks = sortTasks(snapshot.tasks.filter((task) => task.projectId === project.id));
          return (
            <ProjectSection
              key={project.id}
              archiveTask={archiveTask}
              createTask={createTask}
              moveTask={moveTask}
              project={project}
              tasks={tasks}
              toggleTask={toggleTask}
            />
          );
        })
      )}
    </ScrollView>
  );
}

function ProjectComposer({ onSubmit }: { onSubmit: (input: CreateProjectInput) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const trimmedName = name.trim();

  const submitProject = async () => {
    if (!trimmedName || busy) return;

    setBusy(true);
    await onSubmit({ name: trimmedName });
    setName("");
    setBusy(false);
  };

  return (
    <View style={styles.projectComposer}>
      <Text style={styles.composerLabel}>CREATE PROJECT</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="New project name"
          onChangeText={setName}
          onSubmitEditing={submitProject}
          placeholder="New project..."
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          style={styles.input}
          value={name}
        />
        <AppButton label={busy ? "Creating..." : "Create"} onPress={submitProject} disabled={!trimmedName || busy} />
      </View>
    </View>
  );
}

function ProjectSection({
  project,
  tasks,
  createTask,
  archiveTask,
  moveTask,
  toggleTask,
}: {
  project: Project;
  tasks: Task[];
  createTask: (input: CreateTaskInput) => Promise<void>;
  archiveTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, direction: "up" | "down") => Promise<void>;
  toggleTask: (task: Task) => Promise<void>;
}) {
  const complete = tasks.filter((task) => Boolean(task.completedAt)).length;

  return (
    <View style={styles.projectGroup}>
      <ProjectCard
        name={project.name}
        percent={tasks.length ? (complete / tasks.length) * 100 : 0}
        remaining={tasks.length - complete}
      />
      <TaskComposer
        compact
        defaultType="project"
        label="ADD PROJECT TASK"
        onSubmit={createTask}
        placeholder={`Add task to ${project.name}...`}
        projectId={project.id}
      />
      {tasks.length === 0 ? (
        <Text style={styles.projectEmpty}>No tasks in this project yet.</Text>
      ) : (
        tasks.map((task, index) => (
          <TaskRow
            key={task.id}
            canMoveDown={index < tasks.length - 1}
            canMoveUp={index > 0}
            complete={Boolean(task.completedAt)}
            meta={task.completedAt ? "Completed" : "Project task"}
            onDelete={() => archiveTask(task.id)}
            onMoveDown={() => moveTask(task.id, "down")}
            onMoveUp={() => moveTask(task.id, "up")}
            onToggle={() => toggleTask(task)}
            task={task}
          />
        ))
      )}
    </View>
  );
}

function sortTasks(tasks: Task[]): Task[] {
  return tasks.toSorted((first, second) => first.sortOrder - second.sortOrder || first.createdAt.localeCompare(second.createdAt));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 36 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  eyebrow: { color: colors.accent, fontFamily: fontFamily.black, fontSize: 11, letterSpacing: 1.4 },
  title: { marginTop: 8, color: colors.text, fontFamily: fontFamily.black, fontSize: 32, lineHeight: 38 },
  subcopy: { marginTop: 7, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 28,
    marginBottom: 11,
  },
  sectionTitle: { color: colors.text, fontFamily: fontFamily.black, fontSize: 16 },
  count: { color: colors.muted, fontFamily: fontFamily.black, fontSize: 13 },
  emptyCopy: { color: colors.muted, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  errorText: { marginTop: 16, color: colors.danger, fontFamily: fontFamily.medium, fontSize: 13 },
  projectComposer: {
    marginTop: 22,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: 12,
  },
  composerLabel: {
    marginBottom: 9,
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  input: {
    minHeight: 48,
    flex: 1,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    color: colors.text,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    paddingHorizontal: 13,
  },
  projectGroup: {
    marginBottom: 18,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.025)",
    padding: 10,
  },
  projectEmpty: {
    marginTop: 10,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default ProjectsScreen;
