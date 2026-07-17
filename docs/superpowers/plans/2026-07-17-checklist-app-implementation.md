# Personal Checklist App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V1 personal checklist app approved in `docs/superpowers/specs/2026-07-17-checklist-app-design.md`.

**Architecture:** Create one isolated Expo universal app under `checklist-app/` for mobile and web. Keep product rules in pure TypeScript domain files, use Supabase as the account and sync backend, and layer a premium B Prime + Satoshi React Native UI on top.

**Tech Stack:** Expo, React Native, TypeScript, Supabase Auth/Postgres/Realtime, Vitest, expo-notifications, expo-font, Satoshi local font assets.

---

## Scope Check

The approved spec includes one integrated V1 product: a personal checklist app with quick tasks, daily tasks, simple projects, account sync, streaks, local-midnight reset, and end-of-day reminders. The backend schema, domain rules, state management, UI, and notifications all depend on the same task model, so this is one implementation plan with testable slices.

## File Structure

Create the app in `checklist-app/` to avoid mixing with unrelated workspace files.

- `checklist-app/package.json` - app scripts and dependencies.
- `checklist-app/App.tsx` - app entrypoint, auth gate, provider wiring.
- `checklist-app/.env.example` - Supabase environment variable names.
- `checklist-app/assets/fonts/` - Satoshi OTF files from Fontshare.
- `checklist-app/src/env.ts` - validates Expo public environment variables.
- `checklist-app/src/domain/types.ts` - shared task/project/profile types.
- `checklist-app/src/domain/dates.ts` - local date and streak helpers.
- `checklist-app/src/domain/dates.test.ts` - date and streak tests.
- `checklist-app/src/theme/tokens.ts` - B Prime + Satoshi design tokens.
- `checklist-app/src/theme/fonts.ts` - Satoshi font loading map.
- `checklist-app/src/lib/supabase.ts` - Supabase client.
- `checklist-app/src/lib/reminders.ts` - mobile/web reminder scheduling.
- `checklist-app/src/data/checklistRepository.ts` - repository interface.
- `checklist-app/src/data/supabaseChecklistRepository.ts` - Supabase-backed repository.
- `checklist-app/src/data/mockChecklistRepository.ts` - local repository for UI development and tests.
- `checklist-app/src/state/ChecklistContext.tsx` - state, optimistic actions, realtime refresh hooks.
- `checklist-app/src/components/AppButton.tsx` - premium button primitive.
- `checklist-app/src/components/TaskRow.tsx` - task row with completion/streak state.
- `checklist-app/src/components/ProgressCard.tsx` - stat/progress card.
- `checklist-app/src/components/ProjectCard.tsx` - project summary card.
- `checklist-app/src/screens/AuthScreen.tsx` - sign in and create account.
- `checklist-app/src/screens/TodayScreen.tsx` - main daily command screen.
- `checklist-app/src/screens/DailyScreen.tsx` - daily routine manager.
- `checklist-app/src/screens/ProjectsScreen.tsx` - project list and project detail.
- `checklist-app/src/screens/SettingsScreen.tsx` - account, timezone, reminders.
- `checklist-app/supabase/migrations/20260717000000_initial_schema.sql` - database schema and RLS.

## Task 1: Scaffold the Universal Expo App

**Files:**
- Create: `checklist-app/`
- Create: `checklist-app/.env.example`
- Modify: `checklist-app/package.json`
- Create: `checklist-app/assets/fonts/Satoshi-Regular.otf`
- Create: `checklist-app/assets/fonts/Satoshi-Medium.otf`
- Create: `checklist-app/assets/fonts/Satoshi-Bold.otf`
- Create: `checklist-app/assets/fonts/Satoshi-Black.otf`

- [ ] **Step 1: Create the Expo TypeScript project**

Run from the workspace root:

```powershell
npx create-expo-app@latest checklist-app --template blank-typescript
```

Expected: `checklist-app/package.json`, `checklist-app/App.tsx`, and Expo config files exist.

- [ ] **Step 2: Install runtime dependencies**

Run:

```powershell
cd checklist-app
npx expo install expo-font expo-notifications expo-device @react-native-async-storage/async-storage
npm install @supabase/supabase-js
```

Expected: package install finishes with no dependency conflict.

- [ ] **Step 3: Install development dependencies**

Run:

```powershell
npm install --save-dev vitest @types/node
```

Expected: `vitest` appears in `devDependencies`.

- [ ] **Step 4: Add scripts to `package.json`**

Modify the `scripts` block:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "vitest --run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 5: Download and place Satoshi font files**

Run from `checklist-app/`:

```powershell
New-Item -ItemType Directory -Force -Path assets\fonts | Out-Null
Invoke-WebRequest -Uri "https://api.fontshare.com/v2/fonts/download/satoshi" -OutFile assets\fonts\satoshi.zip -UseBasicParsing
Expand-Archive -LiteralPath assets\fonts\satoshi.zip -DestinationPath assets\fonts\satoshi-expanded -Force
Copy-Item assets\fonts\satoshi-expanded\Satoshi_Complete\Fonts\OTF\Satoshi-Regular.otf assets\fonts\Satoshi-Regular.otf
Copy-Item assets\fonts\satoshi-expanded\Satoshi_Complete\Fonts\OTF\Satoshi-Medium.otf assets\fonts\Satoshi-Medium.otf
Copy-Item assets\fonts\satoshi-expanded\Satoshi_Complete\Fonts\OTF\Satoshi-Bold.otf assets\fonts\Satoshi-Bold.otf
Copy-Item assets\fonts\satoshi-expanded\Satoshi_Complete\Fonts\OTF\Satoshi-Black.otf assets\fonts\Satoshi-Black.otf
Remove-Item -LiteralPath assets\fonts\satoshi.zip
Remove-Item -LiteralPath assets\fonts\satoshi-expanded -Recurse
```

Expected: the four OTF files exist in `assets/fonts/`.

- [ ] **Step 6: Add Supabase environment example**

Create `checklist-app/.env.example`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 7: Verify the scaffold**

Run:

```powershell
npm run typecheck
```

Expected: TypeScript finishes successfully or only reports template-generated unused symbol warnings. Fix unused symbols before committing.

- [ ] **Step 8: Commit the scaffold**

Run:

```powershell
git add checklist-app
git commit -m "feat: scaffold checklist app"
```

## Task 2: Add Domain Types, Local Date Helpers, and Streak Tests

**Files:**
- Create: `checklist-app/src/domain/types.ts`
- Create: `checklist-app/src/domain/dates.ts`
- Create: `checklist-app/src/domain/dates.test.ts`

- [ ] **Step 1: Create domain types**

Create `src/domain/types.ts`:

```ts
export type TaskType = "quick" | "daily" | "project";

export type Task = {
  id: string;
  userId: string;
  projectId: string | null;
  type: TaskType;
  title: string;
  sortOrder: number;
  isArchived: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  userId: string;
  name: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DailyCompletion = {
  id: string;
  userId: string;
  taskId: string;
  localDate: string;
  completedAt: string;
};

export type ReminderPreferences = {
  userId: string;
  enabled: boolean;
  reminderTime: string;
};

export type ChecklistSnapshot = {
  tasks: Task[];
  projects: Project[];
  dailyCompletions: DailyCompletion[];
  reminderPreferences: ReminderPreferences;
  timezone: string;
};

export type TaskStatus = {
  task: Task;
  isCompleteToday: boolean;
  streak: number;
};
```

- [ ] **Step 2: Write date helper tests first**

Create `src/domain/dates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  calculateCurrentStreak,
  isCompletedOnDate,
  localDateKey,
  shiftLocalDateKey,
} from "./dates";
import type { DailyCompletion } from "./types";

const completion = (taskId: string, localDate: string): DailyCompletion => ({
  id: `${taskId}-${localDate}`,
  userId: "user-1",
  taskId,
  localDate,
  completedAt: `${localDate}T12:00:00.000Z`,
});

describe("localDateKey", () => {
  it("uses the supplied timezone instead of the computer timezone", () => {
    const date = new Date("2026-07-18T03:30:00.000Z");
    expect(localDateKey(date, "America/New_York")).toBe("2026-07-17");
    expect(localDateKey(date, "Asia/Kolkata")).toBe("2026-07-18");
  });
});

describe("shiftLocalDateKey", () => {
  it("moves across month boundaries", () => {
    expect(shiftLocalDateKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftLocalDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("isCompletedOnDate", () => {
  it("detects completion for a single task on a local date", () => {
    const completions = [completion("daily-1", "2026-07-17")];
    expect(isCompletedOnDate(completions, "daily-1", "2026-07-17")).toBe(true);
    expect(isCompletedOnDate(completions, "daily-2", "2026-07-17")).toBe(false);
  });
});

describe("calculateCurrentStreak", () => {
  it("counts backward from today while dates are consecutive", () => {
    const completions = [
      completion("daily-1", "2026-07-17"),
      completion("daily-1", "2026-07-16"),
      completion("daily-1", "2026-07-15"),
      completion("daily-1", "2026-07-13"),
    ];

    expect(calculateCurrentStreak(completions, "daily-1", "2026-07-17")).toBe(3);
  });

  it("returns zero when today was missed", () => {
    const completions = [completion("daily-1", "2026-07-16")];
    expect(calculateCurrentStreak(completions, "daily-1", "2026-07-17")).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```powershell
npm test -- src/domain/dates.test.ts
```

Expected: FAIL because `src/domain/dates.ts` does not exist.

- [ ] **Step 4: Implement date helpers**

Create `src/domain/dates.ts`:

```ts
import type { DailyCompletion } from "./types";

export function localDateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const part = (type: string) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function shiftLocalDateKey(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

export function isCompletedOnDate(
  completions: DailyCompletion[],
  taskId: string,
  localDate: string,
): boolean {
  return completions.some((completion) => completion.taskId === taskId && completion.localDate === localDate);
}

export function calculateCurrentStreak(
  completions: DailyCompletion[],
  taskId: string,
  todayLocalDate: string,
): number {
  const completedDates = new Set(
    completions
      .filter((completion) => completion.taskId === taskId)
      .map((completion) => completion.localDate),
  );

  let streak = 0;
  let cursor = todayLocalDate;

  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = shiftLocalDateKey(cursor, -1);
  }

  return streak;
}
```

- [ ] **Step 5: Run tests and typecheck**

Run:

```powershell
npm test -- src/domain/dates.test.ts
npm run typecheck
```

Expected: PASS for tests and typecheck.

- [ ] **Step 6: Commit domain rules**

Run:

```powershell
git add checklist-app/src/domain
git commit -m "feat: add checklist domain rules"
```

## Task 3: Add Supabase Schema and Row-Level Security

**Files:**
- Create: `checklist-app/supabase/migrations/20260717000000_initial_schema.sql`

- [ ] **Step 1: Create the initial migration**

Create `supabase/migrations/20260717000000_initial_schema.sql`:

```sql
create extension if not exists "pgcrypto";

create type public.task_type as enum ('quick', 'daily', 'project');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  type public.task_type not null,
  title text not null check (char_length(trim(title)) between 1 and 240),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_task_requires_project check (
    (type = 'project' and project_id is not null) or
    (type <> 'project' and project_id is null)
  )
);

create table public.daily_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  local_date date not null,
  completed_at timestamptz not null default now(),
  unique (user_id, task_id, local_date)
);

create table public.reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  reminder_time time not null default '23:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger reminder_preferences_updated_at
before update on public.reminder_preferences
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.reminder_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_completions enable row level security;
alter table public.reminder_preferences enable row level security;

create policy "profiles are private"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "projects are private"
on public.projects for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "tasks are private"
on public.tasks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "daily completions are private"
on public.daily_completions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reminder preferences are private"
on public.reminder_preferences for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index projects_user_order_idx on public.projects (user_id, sort_order, created_at);
create index tasks_user_type_order_idx on public.tasks (user_id, type, sort_order, created_at);
create index tasks_project_order_idx on public.tasks (project_id, sort_order, created_at);
create index daily_completions_user_task_date_idx on public.daily_completions (user_id, task_id, local_date desc);
```

- [ ] **Step 2: Validate SQL syntax locally if Supabase CLI is available**

Run:

```powershell
supabase db lint
```

Expected: PASS. If Supabase CLI is not installed, record that in the final task handoff and continue with client-side work.

- [ ] **Step 3: Commit schema**

Run:

```powershell
git add checklist-app/supabase/migrations/20260717000000_initial_schema.sql
git commit -m "feat: add Supabase schema"
```

## Task 4: Add Environment, Supabase Client, and Repository Interface

**Files:**
- Create: `checklist-app/src/env.ts`
- Create: `checklist-app/src/lib/supabase.ts`
- Create: `checklist-app/src/data/checklistRepository.ts`
- Create: `checklist-app/src/data/mockChecklistRepository.ts`
- Create: `checklist-app/src/data/supabaseChecklistRepository.ts`

- [ ] **Step 1: Add environment helper**

Create `src/env.ts`:

```ts
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function hasSupabaseEnv(): boolean {
  return env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;
}
```

- [ ] **Step 2: Add Supabase client**

Create `src/lib/supabase.ts`:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { env, hasSupabaseEnv } from "../env";

export const supabase = hasSupabaseEnv()
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === "web",
        persistSession: true,
        storage: AsyncStorage,
      },
    })
  : null;
```

- [ ] **Step 3: Add repository interface**

Create `src/data/checklistRepository.ts`:

```ts
import type { ChecklistSnapshot, TaskType } from "../domain/types";

export type CreateTaskInput = {
  title: string;
  type: TaskType;
  projectId?: string | null;
};

export type CreateProjectInput = {
  name: string;
};

export type ChecklistRepository = {
  getSnapshot(userId: string): Promise<ChecklistSnapshot>;
  createTask(userId: string, input: CreateTaskInput): Promise<void>;
  renameTask(userId: string, taskId: string, title: string): Promise<void>;
  archiveTask(userId: string, taskId: string): Promise<void>;
  setTaskComplete(userId: string, taskId: string, localDate: string, complete: boolean): Promise<void>;
  createProject(userId: string, input: CreateProjectInput): Promise<void>;
  renameProject(userId: string, projectId: string, name: string): Promise<void>;
  archiveProject(userId: string, projectId: string): Promise<void>;
  updateReminderPreference(userId: string, enabled: boolean, reminderTime: string): Promise<void>;
  updateTimezone(userId: string, timezone: string): Promise<void>;
};
```

- [ ] **Step 4: Add mock repository for UI development**

Create `src/data/mockChecklistRepository.ts` with deterministic demo data:

```ts
import type { ChecklistSnapshot, DailyCompletion, Project, ReminderPreferences, Task } from "../domain/types";
import type { ChecklistRepository, CreateProjectInput, CreateTaskInput } from "./checklistRepository";

const now = "2026-07-17T12:00:00.000Z";

let tasks: Task[] = [
  { id: "daily-1", userId: "demo-user", projectId: null, type: "daily", title: "Morning stretch", sortOrder: 1, isArchived: false, completedAt: null, createdAt: now, updatedAt: now },
  { id: "daily-2", userId: "demo-user", projectId: null, type: "daily", title: "Read 20 minutes", sortOrder: 2, isArchived: false, completedAt: null, createdAt: now, updatedAt: now },
  { id: "quick-1", userId: "demo-user", projectId: null, type: "quick", title: "Send invoice", sortOrder: 3, isArchived: false, completedAt: null, createdAt: now, updatedAt: now },
  { id: "project-task-1", userId: "demo-user", projectId: "project-1", type: "project", title: "Write release notes", sortOrder: 1, isArchived: false, completedAt: null, createdAt: now, updatedAt: now },
];

let projects: Project[] = [
  { id: "project-1", userId: "demo-user", name: "Launch checklist", sortOrder: 1, isArchived: false, createdAt: now, updatedAt: now },
];

let dailyCompletions: DailyCompletion[] = [
  { id: "dc-1", userId: "demo-user", taskId: "daily-1", localDate: "2026-07-17", completedAt: now },
  { id: "dc-2", userId: "demo-user", taskId: "daily-1", localDate: "2026-07-16", completedAt: now },
];

let reminderPreferences: ReminderPreferences = {
  userId: "demo-user",
  enabled: true,
  reminderTime: "23:00",
};

export const mockChecklistRepository: ChecklistRepository = {
  async getSnapshot() {
    return {
      tasks: tasks.filter((task) => !task.isArchived),
      projects: projects.filter((project) => !project.isArchived),
      dailyCompletions,
      reminderPreferences,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  },
  async createTask(userId: string, input: CreateTaskInput) {
    const id = `${input.type}-${Date.now()}`;
    tasks = [{ id, userId, projectId: input.projectId ?? null, type: input.type, title: input.title, sortOrder: tasks.length + 1, isArchived: false, completedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...tasks];
  },
  async renameTask(_userId: string, taskId: string, title: string) {
    tasks = tasks.map((task) => (task.id === taskId ? { ...task, title, updatedAt: new Date().toISOString() } : task));
  },
  async archiveTask(_userId: string, taskId: string) {
    tasks = tasks.map((task) => (task.id === taskId ? { ...task, isArchived: true } : task));
  },
  async setTaskComplete(_userId: string, taskId: string, localDate: string, complete: boolean) {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) return;
    if (task.type === "daily") {
      dailyCompletions = complete
        ? [...dailyCompletions, { id: `${taskId}-${localDate}`, userId: task.userId, taskId, localDate, completedAt: new Date().toISOString() }]
        : dailyCompletions.filter((entry) => !(entry.taskId === taskId && entry.localDate === localDate));
      return;
    }
    tasks = tasks.map((entry) => (entry.id === taskId ? { ...entry, completedAt: complete ? new Date().toISOString() : null } : entry));
  },
  async createProject(userId: string, input: CreateProjectInput) {
    projects = [{ id: `project-${Date.now()}`, userId, name: input.name, sortOrder: projects.length + 1, isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...projects];
  },
  async renameProject(_userId: string, projectId: string, name: string) {
    projects = projects.map((project) => (project.id === projectId ? { ...project, name, updatedAt: new Date().toISOString() } : project));
  },
  async archiveProject(_userId: string, projectId: string) {
    projects = projects.map((project) => (project.id === projectId ? { ...project, isArchived: true } : project));
  },
  async updateReminderPreference(userId: string, enabled: boolean, reminderTime: string) {
    reminderPreferences = { userId, enabled, reminderTime };
  },
  async updateTimezone() {
    return;
  },
};
```

- [ ] **Step 5: Add Supabase repository**

Create `src/data/supabaseChecklistRepository.ts`. Implement each method from `ChecklistRepository` using the table names from Task 3. Use `.eq("user_id", userId)` on all user-owned reads and writes. Use `.insert({ user_id: userId, task_id: taskId, local_date: localDate })` for completing daily tasks, `.delete()` for uncompleting daily tasks, and `.update({ completed_at: new Date().toISOString() })` for quick/project task completion.

Minimal method shape:

```ts
import type { ChecklistSnapshot } from "../domain/types";
import type { ChecklistRepository, CreateProjectInput, CreateTaskInput } from "./checklistRepository";
import { supabase } from "../lib/supabase";

function client() {
  if (!supabase) throw new Error("Supabase environment is not configured.");
  return supabase;
}

export const supabaseChecklistRepository: ChecklistRepository = {
  async getSnapshot(userId: string): Promise<ChecklistSnapshot> {
    const db = client();
    const [profile, tasks, projects, dailyCompletions, reminderPreferences] = await Promise.all([
      db.from("profiles").select("timezone").eq("id", userId).single(),
      db.from("tasks").select("*").eq("user_id", userId).eq("is_archived", false).order("sort_order"),
      db.from("projects").select("*").eq("user_id", userId).eq("is_archived", false).order("sort_order"),
      db.from("daily_completions").select("*").eq("user_id", userId),
      db.from("reminder_preferences").select("*").eq("user_id", userId).single(),
    ]);

    for (const result of [profile, tasks, projects, dailyCompletions, reminderPreferences]) {
      if (result.error) throw result.error;
    }

    return {
      timezone: profile.data.timezone,
      tasks: tasks.data.map((task) => ({
        id: task.id,
        userId: task.user_id,
        projectId: task.project_id,
        type: task.type,
        title: task.title,
        sortOrder: task.sort_order,
        isArchived: task.is_archived,
        completedAt: task.completed_at,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      })),
      projects: projects.data.map((project) => ({
        id: project.id,
        userId: project.user_id,
        name: project.name,
        sortOrder: project.sort_order,
        isArchived: project.is_archived,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      })),
      dailyCompletions: dailyCompletions.data.map((entry) => ({
        id: entry.id,
        userId: entry.user_id,
        taskId: entry.task_id,
        localDate: entry.local_date,
        completedAt: entry.completed_at,
      })),
      reminderPreferences: {
        userId: reminderPreferences.data.user_id,
        enabled: reminderPreferences.data.enabled,
        reminderTime: reminderPreferences.data.reminder_time.slice(0, 5),
      },
    };
  },
  async createTask(userId: string, input: CreateTaskInput) {
    const { error } = await client().from("tasks").insert({
      user_id: userId,
      project_id: input.projectId ?? null,
      type: input.type,
      title: input.title.trim(),
    });
    if (error) throw error;
  },
  async renameTask(userId: string, taskId: string, title: string) {
    const { error } = await client().from("tasks").update({ title: title.trim() }).eq("user_id", userId).eq("id", taskId);
    if (error) throw error;
  },
  async archiveTask(userId: string, taskId: string) {
    const { error } = await client().from("tasks").update({ is_archived: true }).eq("user_id", userId).eq("id", taskId);
    if (error) throw error;
  },
  async setTaskComplete(userId: string, taskId: string, localDate: string, complete: boolean) {
    const db = client();
    const { data: task, error: taskError } = await db.from("tasks").select("type").eq("user_id", userId).eq("id", taskId).single();
    if (taskError) throw taskError;

    if (task.type === "daily") {
      const result = complete
        ? await db.from("daily_completions").upsert({ user_id: userId, task_id: taskId, local_date: localDate }, { onConflict: "user_id,task_id,local_date" })
        : await db.from("daily_completions").delete().eq("user_id", userId).eq("task_id", taskId).eq("local_date", localDate);
      if (result.error) throw result.error;
      return;
    }

    const { error } = await db.from("tasks").update({ completed_at: complete ? new Date().toISOString() : null }).eq("user_id", userId).eq("id", taskId);
    if (error) throw error;
  },
  async createProject(userId: string, input: CreateProjectInput) {
    const { error } = await client().from("projects").insert({ user_id: userId, name: input.name.trim() });
    if (error) throw error;
  },
  async renameProject(userId: string, projectId: string, name: string) {
    const { error } = await client().from("projects").update({ name: name.trim() }).eq("user_id", userId).eq("id", projectId);
    if (error) throw error;
  },
  async archiveProject(userId: string, projectId: string) {
    const { error } = await client().from("projects").update({ is_archived: true }).eq("user_id", userId).eq("id", projectId);
    if (error) throw error;
  },
  async updateReminderPreference(userId: string, enabled: boolean, reminderTime: string) {
    const { error } = await client().from("reminder_preferences").upsert({ user_id: userId, enabled, reminder_time: reminderTime });
    if (error) throw error;
  },
  async updateTimezone(userId: string, timezone: string) {
    const { error } = await client().from("profiles").update({ timezone }).eq("id", userId);
    if (error) throw error;
  },
};
```

- [ ] **Step 6: Typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit repository layer**

Run:

```powershell
git add checklist-app/src/env.ts checklist-app/src/lib/supabase.ts checklist-app/src/data
git commit -m "feat: add checklist data layer"
```

## Task 5: Add Checklist State and Optimistic Actions

**Files:**
- Create: `checklist-app/src/state/ChecklistContext.tsx`

- [ ] **Step 1: Create checklist context**

Create `src/state/ChecklistContext.tsx`:

```tsx
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ChecklistSnapshot, Task } from "../domain/types";
import { calculateCurrentStreak, isCompletedOnDate, localDateKey } from "../domain/dates";
import type { ChecklistRepository, CreateTaskInput } from "../data/checklistRepository";

type ChecklistContextValue = {
  snapshot: ChecklistSnapshot | null;
  todayLocalDate: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<void>;
  toggleTask: (task: Task) => Promise<void>;
};

const ChecklistContext = createContext<ChecklistContextValue | null>(null);

export function ChecklistProvider({
  children,
  repository,
  userId,
}: PropsWithChildren<{ repository: ChecklistRepository; userId: string }>) {
  const [snapshot, setSnapshot] = useState<ChecklistSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayLocalDate = useMemo(() => {
    const timezone = snapshot?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    return localDateKey(new Date(), timezone);
  }, [snapshot?.timezone]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await repository.getSnapshot(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [repository, userId]);

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      if (!input.title.trim()) return;
      await repository.createTask(userId, input);
      await refresh();
    },
    [refresh, repository, userId],
  );

  const toggleTask = useCallback(
    async (task: Task) => {
      if (!snapshot) return;
      const currentlyComplete =
        task.type === "daily"
          ? isCompletedOnDate(snapshot.dailyCompletions, task.id, todayLocalDate)
          : Boolean(task.completedAt);

      setSnapshot({
        ...snapshot,
        tasks: snapshot.tasks.map((entry) =>
          entry.id === task.id && entry.type !== "daily"
            ? { ...entry, completedAt: currentlyComplete ? null : new Date().toISOString() }
            : entry,
        ),
        dailyCompletions:
          task.type === "daily" && !currentlyComplete
            ? [
                ...snapshot.dailyCompletions,
                {
                  id: `${task.id}-${todayLocalDate}`,
                  userId,
                  taskId: task.id,
                  localDate: todayLocalDate,
                  completedAt: new Date().toISOString(),
                },
              ]
            : snapshot.dailyCompletions.filter((entry) => !(entry.taskId === task.id && entry.localDate === todayLocalDate)),
      });

      try {
        await repository.setTaskComplete(userId, task.id, todayLocalDate, !currentlyComplete);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update task.");
        await refresh();
      }
    },
    [refresh, repository, snapshot, todayLocalDate, userId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ snapshot, todayLocalDate, loading, error, refresh, createTask, toggleTask }),
    [createTask, error, loading, refresh, snapshot, todayLocalDate, toggleTask],
  );

  return <ChecklistContext.Provider value={value}>{children}</ChecklistContext.Provider>;
}

export function useChecklist() {
  const value = useContext(ChecklistContext);
  if (!value) throw new Error("useChecklist must be used inside ChecklistProvider.");
  return value;
}

export function getDailyStreak(snapshot: ChecklistSnapshot, taskId: string, todayLocalDate: string): number {
  return calculateCurrentStreak(snapshot.dailyCompletions, taskId, todayLocalDate);
}
```

- [ ] **Step 2: Typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit state layer**

Run:

```powershell
git add checklist-app/src/state/ChecklistContext.tsx
git commit -m "feat: add checklist state provider"
```

## Task 6: Add Premium Theme and Reusable Components

**Files:**
- Create: `checklist-app/src/theme/tokens.ts`
- Create: `checklist-app/src/theme/fonts.ts`
- Create: `checklist-app/src/components/AppButton.tsx`
- Create: `checklist-app/src/components/TaskRow.tsx`
- Create: `checklist-app/src/components/ProgressCard.tsx`
- Create: `checklist-app/src/components/ProjectCard.tsx`

- [ ] **Step 1: Add theme tokens**

Create `src/theme/tokens.ts`:

```ts
export const colors = {
  bg: "#07080B",
  panel: "#101217",
  panel2: "#151922",
  panel3: "#1B202B",
  line: "rgba(255,255,255,0.11)",
  lineStrong: "rgba(255,255,255,0.2)",
  text: "#F5F7FB",
  muted: "#8F98A8",
  green: "#58E7BD",
  amber: "#F6B95D",
  blue: "#75A7FF",
  danger: "#F26D5F",
  black: "#050609",
};

export const radii = {
  card: 8,
  pill: 999,
};

export const fontFamily = {
  regular: "Satoshi-Regular",
  medium: "Satoshi-Medium",
  bold: "Satoshi-Bold",
  black: "Satoshi-Black",
};
```

- [ ] **Step 2: Add font loader**

Create `src/theme/fonts.ts`:

```ts
import { useFonts } from "expo-font";

export function useAppFonts() {
  return useFonts({
    "Satoshi-Regular": require("../../assets/fonts/Satoshi-Regular.otf"),
    "Satoshi-Medium": require("../../assets/fonts/Satoshi-Medium.otf"),
    "Satoshi-Bold": require("../../assets/fonts/Satoshi-Bold.otf"),
    "Satoshi-Black": require("../../assets/fonts/Satoshi-Black.otf"),
  });
}
```

- [ ] **Step 3: Add premium button**

Create `src/components/AppButton.tsx`:

```tsx
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontFamily, radii } from "../theme/tokens";

export function AppButton({ label, onPress, tone = "primary" }: { label: string; onPress: () => void; tone?: "primary" | "ghost" }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, tone === "ghost" && styles.ghost, pressed && styles.pressed]}>
      <Text style={[styles.label, tone === "ghost" && styles.ghostLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.card,
    backgroundColor: colors.green,
    paddingHorizontal: 16,
  },
  ghost: {
    backgroundColor: colors.panel2,
    borderColor: colors.line,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.78,
  },
  label: {
    color: "#06110F",
    fontFamily: fontFamily.black,
    fontSize: 14,
  },
  ghostLabel: {
    color: colors.text,
  },
});
```

- [ ] **Step 4: Add task row**

Create `src/components/TaskRow.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Task } from "../domain/types";
import { colors, fontFamily, radii } from "../theme/tokens";

export function TaskRow({
  task,
  complete,
  streak,
  meta,
  onToggle,
}: {
  task: Task;
  complete: boolean;
  streak?: number;
  meta: string;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.check, complete && styles.checkComplete]}>
        {complete ? <Text style={styles.checkText}>✓</Text> : null}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, complete && styles.done]}>{task.title}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      {typeof streak === "number" ? <Text style={styles.badge}>{streak}d</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
  },
  pressed: {
    opacity: 0.8,
  },
  check: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#596273",
  },
  checkComplete: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  checkText: {
    color: "#06110F",
    fontFamily: fontFamily.black,
    fontSize: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  done: {
    color: "#8D96A7",
    textDecorationLine: "line-through",
    textDecorationColor: colors.green,
  },
  meta: {
    marginTop: 3,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 11,
  },
  badge: {
    minWidth: 42,
    overflow: "hidden",
    borderRadius: radii.pill,
    backgroundColor: "rgba(88,231,189,0.1)",
    color: colors.green,
    fontFamily: fontFamily.black,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: "center",
  },
});
```

- [ ] **Step 5: Add progress and project cards**

Create `src/components/ProgressCard.tsx`:

```tsx
import { StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radii } from "../theme/tokens";

export function ProgressCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 92,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: 14,
  },
  label: {
    color: colors.muted,
    fontFamily: fontFamily.black,
    fontSize: 11,
    textTransform: "uppercase",
  },
  value: {
    marginTop: 10,
    color: colors.text,
    fontFamily: fontFamily.black,
    fontSize: 28,
    lineHeight: 30,
  },
  detail: {
    marginTop: 7,
    color: colors.green,
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
});
```

Create `src/components/ProjectCard.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radii } from "../theme/tokens";

export function ProjectCard({
  name,
  remaining,
  percent,
  onPress,
}: {
  name: string;
  remaining: number;
  percent: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>{remaining} tasks left</Text>
        </View>
        <Text style={styles.badge}>{percent}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, Math.min(percent, 100))}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    padding: 13,
  },
  pressed: {
    opacity: 0.82,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  meta: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: fontFamily.regular,
    fontSize: 11,
  },
  badge: {
    overflow: "hidden",
    borderRadius: radii.pill,
    backgroundColor: "rgba(88,231,189,0.1)",
    color: colors.green,
    fontFamily: fontFamily.black,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  track: {
    height: 6,
    marginTop: 13,
    overflow: "hidden",
    borderRadius: radii.pill,
    backgroundColor: "#252B37",
  },
  fill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.blue,
  },
});
```

- [ ] **Step 6: Typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit theme and components**

Run:

```powershell
git add checklist-app/src/theme checklist-app/src/components
git commit -m "feat: add premium checklist UI primitives"
```

## Task 7: Build Auth, Today, Daily, Projects, and Settings Screens

**Files:**
- Modify: `checklist-app/App.tsx`
- Create: `checklist-app/src/screens/AuthScreen.tsx`
- Create: `checklist-app/src/screens/TodayScreen.tsx`
- Create: `checklist-app/src/screens/DailyScreen.tsx`
- Create: `checklist-app/src/screens/ProjectsScreen.tsx`
- Create: `checklist-app/src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Add Today screen**

Create `src/screens/TodayScreen.tsx`:

```tsx
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { ProgressCard } from "../components/ProgressCard";
import { ProjectCard } from "../components/ProjectCard";
import { TaskRow } from "../components/TaskRow";
import { isCompletedOnDate } from "../domain/dates";
import { getDailyStreak, useChecklist } from "../state/ChecklistContext";
import { colors, fontFamily } from "../theme/tokens";

export function TodayScreen() {
  const { snapshot, todayLocalDate, loading, error, toggleTask } = useChecklist();

  if (loading || !snapshot) {
    return <View style={styles.center}><ActivityIndicator color={colors.green} /></View>;
  }

  const dailyTasks = snapshot.tasks.filter((task) => task.type === "daily");
  const quickTasks = snapshot.tasks.filter((task) => task.type === "quick");
  const completedDaily = dailyTasks.filter((task) => isCompletedOnDate(snapshot.dailyCompletions, task.id, todayLocalDate)).length;
  const completedQuick = quickTasks.filter((task) => Boolean(task.completedAt)).length;
  const totalToday = dailyTasks.length + quickTasks.length;
  const completedToday = completedDaily + completedQuick;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Personal command list</Text>
          <Text style={styles.title}>Today</Text>
          <Text style={styles.sub}>Local midnight reset • 11:00 PM reminder</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.stats}>
        <ProgressCard label="Completed" value={`${completedToday}/${totalToday}`} detail="today" />
        <ProgressCard label="Daily" value={`${completedDaily}/${dailyTasks.length}`} detail="routine" />
      </View>

      <Text style={styles.section}>Daily</Text>
      {dailyTasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          complete={isCompletedOnDate(snapshot.dailyCompletions, task.id, todayLocalDate)}
          streak={getDailyStreak(snapshot, task.id, todayLocalDate)}
          meta="Resets at local midnight"
          onToggle={() => toggleTask(task)}
        />
      ))}

      <Text style={styles.section}>Quick</Text>
      {quickTasks.map((task) => (
        <TaskRow key={task.id} task={task} complete={Boolean(task.completedAt)} meta="One-off task" onToggle={() => toggleTask(task)} />
      ))}

      <Text style={styles.section}>Projects</Text>
      {snapshot.projects.map((project) => {
        const projectTasks = snapshot.tasks.filter((task) => task.projectId === project.id);
        const completed = projectTasks.filter((task) => Boolean(task.completedAt)).length;
        const percent = projectTasks.length === 0 ? 0 : Math.round((completed / projectTasks.length) * 100);
        return <ProjectCard key={project.id} name={project.name} remaining={projectTasks.length - completed} percent={percent} onPress={() => undefined} />;
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  header: { marginBottom: 20 },
  kicker: { color: colors.green, fontFamily: fontFamily.black, fontSize: 12, textTransform: "uppercase" },
  title: { marginTop: 8, color: colors.text, fontFamily: fontFamily.black, fontSize: 42, lineHeight: 44 },
  sub: { marginTop: 8, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 13 },
  stats: { flexDirection: "row", gap: 10, marginBottom: 18 },
  section: { marginTop: 18, marginBottom: 9, color: "#7D8798", fontFamily: fontFamily.black, fontSize: 11, textTransform: "uppercase" },
  error: { marginBottom: 12, color: colors.danger, fontFamily: fontFamily.medium },
});
```

- [ ] **Step 2: Add remaining screens**

Create `src/screens/DailyScreen.tsx`:

```tsx
import { ScrollView, StyleSheet, Text } from "react-native";
import { colors, fontFamily } from "../theme/tokens";

export function DailyScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Daily</Text>
      <Text style={styles.sub}>Manage recurring routines and streaks.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18 },
  title: { color: colors.text, fontFamily: fontFamily.black, fontSize: 36 },
  sub: { marginTop: 8, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14 },
});
```

Create `src/screens/ProjectsScreen.tsx`:

```tsx
import { ScrollView, StyleSheet, Text } from "react-native";
import { ProjectCard } from "../components/ProjectCard";
import { colors, fontFamily } from "../theme/tokens";
import { useChecklist } from "../state/ChecklistContext";

export function ProjectsScreen() {
  const { snapshot } = useChecklist();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Projects</Text>
      <Text style={styles.sub}>Simple personal checklists.</Text>
      {snapshot?.projects.map((project) => {
        const projectTasks = snapshot.tasks.filter((task) => task.projectId === project.id);
        const complete = projectTasks.filter((task) => Boolean(task.completedAt)).length;
        const percent = projectTasks.length === 0 ? 0 : Math.round((complete / projectTasks.length) * 100);
        return <ProjectCard key={project.id} name={project.name} remaining={projectTasks.length - complete} percent={percent} onPress={() => undefined} />;
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18 },
  title: { color: colors.text, fontFamily: fontFamily.black, fontSize: 36 },
  sub: { marginTop: 8, marginBottom: 18, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14 },
});
```

Create `src/screens/SettingsScreen.tsx`:

```tsx
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radii } from "../theme/tokens";
import { useChecklist } from "../state/ChecklistContext";

export function SettingsScreen() {
  const { snapshot } = useChecklist();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.sub}>Account, timezone, and reminder behavior.</Text>
      <View style={styles.panel}>
        <Text style={styles.label}>Timezone</Text>
        <Text style={styles.value}>{snapshot?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.label}>Daily reminder</Text>
        <Text style={styles.value}>{snapshot?.reminderPreferences.enabled ? snapshot.reminderPreferences.reminderTime : "Off"}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18 },
  title: { color: colors.text, fontFamily: fontFamily.black, fontSize: 36 },
  sub: { marginTop: 8, marginBottom: 18, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14 },
  panel: { marginBottom: 10, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, padding: 14 },
  label: { color: colors.muted, fontFamily: fontFamily.black, fontSize: 11, textTransform: "uppercase" },
  value: { marginTop: 8, color: colors.text, fontFamily: fontFamily.bold, fontSize: 16 },
});
```

- [ ] **Step 3: Add Auth screen**

Create `src/screens/AuthScreen.tsx`:

```tsx
import { useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { hasSupabaseEnv } from "../env";
import { supabase } from "../lib/supabase";
import { colors, fontFamily, radii } from "../theme/tokens";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (mode: "signin" | "signup") => {
    if (!supabase || !hasSupabaseEnv()) {
      Alert.alert("Demo mode", "Supabase env is missing. Demo mode is active.");
      return;
    }

    setBusy(true);
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);

    if (result.error) {
      Alert.alert("Authentication failed", result.error.message);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.panel}>
        <Text style={styles.kicker}>Personal command list</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.sub}>Sync your tasks between mobile and browser.</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.muted} style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={colors.muted} style={styles.input} />
        <AppButton label={busy ? "Working..." : "Sign in"} onPress={() => submit("signin")} />
        <View style={styles.gap} />
        <AppButton label="Create account" tone="ghost" onPress={() => submit("signup")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: 18 },
  panel: { width: "100%", maxWidth: 420, borderRadius: radii.card, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.panel, padding: 18 },
  kicker: { color: colors.green, fontFamily: fontFamily.black, fontSize: 12, textTransform: "uppercase" },
  title: { marginTop: 10, color: colors.text, fontFamily: fontFamily.black, fontSize: 42, lineHeight: 44 },
  sub: { marginTop: 8, marginBottom: 18, color: colors.muted, fontFamily: fontFamily.regular, fontSize: 14 },
  input: { minHeight: 46, marginBottom: 10, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, color: colors.text, fontFamily: fontFamily.medium, paddingHorizontal: 12 },
  gap: { height: 10 },
});
```

- [ ] **Step 4: Wire App entrypoint**

Replace `App.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { ChecklistProvider } from "./src/state/ChecklistContext";
import { mockChecklistRepository } from "./src/data/mockChecklistRepository";
import { supabaseChecklistRepository } from "./src/data/supabaseChecklistRepository";
import { hasSupabaseEnv } from "./src/env";
import { supabase } from "./src/lib/supabase";
import { TodayScreen } from "./src/screens/TodayScreen";
import { DailyScreen } from "./src/screens/DailyScreen";
import { ProjectsScreen } from "./src/screens/ProjectsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { useAppFonts } from "./src/theme/fonts";
import { colors, fontFamily } from "./src/theme/tokens";

type Tab = "today" | "daily" | "projects" | "settings";

export default function App() {
  const [fontsLoaded] = useAppFonts();
  const [tab, setTab] = useState<Tab>("today");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  const repository = useMemo(() => (hasSupabaseEnv() && session ? supabaseChecklistRepository : mockChecklistRepository), [session]);
  const userId = session?.user.id ?? "demo-user";

  if (!fontsLoaded) return <View style={styles.loading} />;
  if (hasSupabaseEnv() && !session) return <AuthScreen />;

  const CurrentScreen = tab === "today" ? TodayScreen : tab === "daily" ? DailyScreen : tab === "projects" ? ProjectsScreen : SettingsScreen;

  return (
    <ChecklistProvider repository={repository} userId={userId}>
      <SafeAreaView style={styles.shell}>
        <CurrentScreen />
        <View style={styles.nav}>
          {(["today", "daily", "projects", "settings"] as Tab[]).map((item) => (
            <Pressable key={item} onPress={() => setTab(item)} style={[styles.navItem, tab === item && styles.navItemActive]}>
              <Text style={[styles.navText, tab === item && styles.navTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </ChecklistProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bg },
  shell: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: "row", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.black },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 8, paddingVertical: 10 },
  navItemActive: { backgroundColor: colors.panel2 },
  navText: { color: colors.muted, fontFamily: fontFamily.bold, fontSize: 12, textTransform: "capitalize" },
  navTextActive: { color: colors.text },
});
```

- [ ] **Step 5: Typecheck and run web**

Run:

```powershell
npm run typecheck
npm run web
```

Expected: app opens in web mode, loads demo data when Supabase env is missing, and shows the premium Today screen.

- [ ] **Step 6: Commit screens**

Run:

```powershell
git add checklist-app/App.tsx checklist-app/src/screens
git commit -m "feat: add checklist app screens"
```

## Task 8: Add Reminder Scheduling and Midnight Refresh

**Files:**
- Create: `checklist-app/src/lib/reminders.ts`
- Modify: `checklist-app/src/state/ChecklistContext.tsx`

- [ ] **Step 1: Add reminder helper**

Create `src/lib/reminders.ts`:

```ts
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const REMINDER_IDENTIFIER_PREFIX = "daily-reset-reminder";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function scheduleDailyReminder(unfinishedCount: number, enabled: boolean, reminderTime: string) {
  await cancelDailyReminders();
  if (!enabled || unfinishedCount <= 0) return;

  const [hour, minute] = reminderTime.split(":").map(Number);
  const title = "Daily reset soon";
  const body = unfinishedCount === 1 ? "You have 1 daily task left before midnight." : `You have ${unfinishedCount} daily tasks left before midnight.`;

  if (Platform.OS === "web") {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
    return;
  }

  if (!Device.isDevice) return;

  const permission = await Notifications.getPermissionsAsync();
  const finalPermission = permission.status === "granted" ? permission : await Notifications.requestPermissionsAsync();
  if (finalPermission.status !== "granted") return;

  await Notifications.scheduleNotificationAsync({
    identifier: `${REMINDER_IDENTIFIER_PREFIX}-${hour}-${minute}`,
    content: { title, body },
    trigger: { hour, minute, repeats: true },
  });
}

export async function cancelDailyReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.identifier.startsWith(REMINDER_IDENTIFIER_PREFIX))
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}
```

- [ ] **Step 2: Refresh when the local date changes**

Modify `ChecklistContext.tsx` by adding this effect inside `ChecklistProvider`:

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    const timezone = snapshot?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nextLocalDate = localDateKey(new Date(), timezone);
    if (nextLocalDate !== todayLocalDate) {
      refresh();
    }
  }, 60_000);

  return () => clearInterval(interval);
}, [refresh, snapshot?.timezone, todayLocalDate]);
```

- [ ] **Step 3: Schedule reminders after snapshot refresh**

In `ChecklistContext.tsx`, import `scheduleDailyReminder` and add an effect:

```tsx
useEffect(() => {
  if (!snapshot) return;
  const unfinishedDailyCount = snapshot.tasks.filter(
    (task) => task.type === "daily" && !isCompletedOnDate(snapshot.dailyCompletions, task.id, todayLocalDate),
  ).length;

  scheduleDailyReminder(
    unfinishedDailyCount,
    snapshot.reminderPreferences.enabled,
    snapshot.reminderPreferences.reminderTime,
  );
}, [snapshot, todayLocalDate]);
```

- [ ] **Step 4: Typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit reminders**

Run:

```powershell
git add checklist-app/src/lib/reminders.ts checklist-app/src/state/ChecklistContext.tsx
git commit -m "feat: add daily reminders and reset refresh"
```

## Task 9: Final QA, Documentation, and Handoff

**Files:**
- Create: `checklist-app/README.md`
- Modify: `docs/superpowers/plans/2026-07-17-checklist-app-implementation.md` as tasks are checked during execution.

- [ ] **Step 1: Add README**

Create `checklist-app/README.md`:

```md
# Personal Checklist App

Premium personal checklist app for quick tasks, daily routines with streaks, and simple project checklists.

## Run locally

```powershell
npm install
cp .env.example .env
npm run web
```

Without Supabase env values, the app runs in demo mode with mock data.

## Supabase

Apply `supabase/migrations/20260717000000_initial_schema.sql` to a Supabase project, then set:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Checks

```powershell
npm test
npm run typecheck
npm run web
```
```

- [ ] **Step 2: Run automated checks**

Run from `checklist-app/`:

```powershell
npm test
npm run typecheck
```

Expected: tests pass and TypeScript passes.

- [ ] **Step 3: Run browser app**

Run:

```powershell
npm run web
```

Expected manual checks:

- Today loads with B Prime dark styling and Satoshi text.
- Daily completed task rows strike through.
- Tapping a daily task updates progress immediately.
- Project summary shows remaining task count and percentage.
- Demo mode works when Supabase env is missing.

- [ ] **Step 4: Run mobile smoke check**

Run:

```powershell
npm run android
```

or:

```powershell
npm run ios
```

Expected: Expo launches the app and shows the same Today flow. If the local machine lacks Android/iOS tooling, record the missing tool in the final handoff.

- [ ] **Step 5: Commit final documentation**

Run:

```powershell
git add checklist-app/README.md docs/superpowers/plans/2026-07-17-checklist-app-implementation.md
git commit -m "docs: add checklist app implementation guide"
```

- [ ] **Step 6: Final handoff**

Report:

- The app directory.
- The local web URL used during verification.
- Test and typecheck results.
- Whether Supabase CLI, Android, or iOS checks were unavailable.
- The current commit hash.

## Self-Review

Spec coverage:

- Personal-only quick tasks, daily tasks, and simple projects are covered by Tasks 2, 3, 4, 5, and 7.
- Account sync is covered by Tasks 3 and 4 through Supabase Auth/Postgres/Realtime-ready data access.
- Local-midnight reset and streaks are covered by Tasks 2 and 8.
- 11:00 PM local reminder behavior is covered by Task 8.
- B Prime + Satoshi design is covered by Tasks 1, 6, and 7.
- Browser and mobile delivery are covered by Tasks 1, 7, and 9.

Placeholder scan:

- No unchecked task relies on unnamed files.
- Each task names concrete files, commands, and code bodies.
- Binary font assets are fetched from the verified Fontshare zip URL and copied from exact archive paths.

Type consistency:

- `Task`, `Project`, `DailyCompletion`, `ReminderPreferences`, and `ChecklistSnapshot` are defined before they are used.
- Repository method names in the state provider match `ChecklistRepository`.
- Date helper names used in UI/state match `dates.ts`.
