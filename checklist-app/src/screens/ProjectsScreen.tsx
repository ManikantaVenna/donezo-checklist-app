import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { ProjectCard } from "../components/ProjectCard";
import { TaskComposer } from "../components/TaskComposer";
import { TaskRow } from "../components/TaskRow";
import { TaskUndoToast } from "../components/TaskUndoToast";
import type { CreateProjectInput, CreateTaskInput } from "../data/checklistRepository";
import { sortedCopy } from "../domain/sorting";
import type { Project, Task } from "../domain/types";
import { useTaskDeleteUndo } from "../hooks/useTaskDeleteUndo";
import { useChecklist } from "../state/ChecklistContext";
import { colors, fontFamily, radii } from "../theme/tokens";

export function ProjectsScreen() {
  const {
    snapshot,
    loading,
    error,
    createProject,
    createTask,
    archiveTask,
    restoreTask,
    archiveProject,
    moveTask,
    toggleTask,
  } = useChecklist();
  const { deletedTask, deleteTask, undoDelete } = useTaskDeleteUndo({ archiveTask, restoreTask });

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
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        style={styles.scroll}
      >
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
                archiveProject={archiveProject}
                createTask={createTask}
                deleteTask={deleteTask}
                moveTask={moveTask}
                project={project}
                tasks={tasks}
                toggleTask={toggleTask}
              />
            );
          })
        )}
      </ScrollView>
      {deletedTask ? <TaskUndoToast onUndo={undoDelete} taskTitle={deletedTask.title} /> : null}
    </View>
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
  deleteTask,
  archiveProject,
  moveTask,
  toggleTask,
}: {
  project: Project;
  tasks: Task[];
  createTask: (input: CreateTaskInput) => Promise<void>;
  deleteTask: (task: Task) => void;
  archiveProject: (projectId: string) => Promise<void>;
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
      <View style={styles.projectActions}>
        <Text style={styles.projectHint}>Deleting a project removes its active tasks too.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${project.name}`}
          onPress={() => archiveProject(project.id)}
          style={({ pressed }) => [styles.deleteProjectButton, pressed && styles.pressed]}
        >
          <Text style={styles.deleteProjectText}>Delete project</Text>
        </Pressable>
      </View>
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
            onDelete={() => deleteTask(task)}
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
  return sortedCopy(tasks, (first, second) => first.sortOrder - second.sortOrder || first.createdAt.localeCompare(second.createdAt));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 86 },
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
  projectActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },
  projectHint: {
    flex: 1,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  deleteProjectButton: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(242,109,95,0.28)",
    paddingHorizontal: 12,
  },
  deleteProjectText: {
    color: colors.danger,
    fontFamily: fontFamily.black,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.78,
  },
});

export default ProjectsScreen;
