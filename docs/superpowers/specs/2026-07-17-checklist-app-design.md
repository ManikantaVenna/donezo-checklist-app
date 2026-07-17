# Personal Checklist App Design

Date: 2026-07-17
Status: Approved outline, pending final user review
Process: Superpowers brainstorming

## Summary

This app is a personal checklist system for quick daily execution. Version 1 combines three related modes:

- Quick tasks for lightweight capture and one-off work.
- Daily tasks for recurring routines and habits with streaks.
- Simple projects that contain flat task checklists.

The app must feel smooth, premium, and strong rather than playful or hobby-like. The approved visual direction is `B Prime + Satoshi`: a dark, crisp, high-confidence interface with restrained glow, sharp task states, and polished typography.

The app will run as a mobile app and a browser app, with automatic sync through a user account.

## Goals

- Make capture, completion, and review feel fast enough for daily use.
- Support mobile and browser access from one product experience.
- Sync tasks automatically between devices through an account.
- Treat version 1 as strictly personal: one user's private tasks only.
- Support daily task streaks with local-midnight reset behavior.
- Show completed tasks as struck through immediately after completion.
- Remind the user one hour before local midnight if daily tasks remain unfinished.
- Keep projects simple: a project is a named checklist containing tasks.
- Use a premium interface that feels expensive, strong, and polished.

## Non-Goals for Version 1

- Collaboration, sharing, teams, or public lists.
- Nested subtasks, project sections, comments, attachments, or labels.
- Complex recurrence rules beyond daily routines.
- Calendar integrations.
- Public templates or marketplace features.
- Social habit tracking or leaderboards.
- Advanced analytics beyond streaks and basic progress.

## Platforms

Version 1 will use a universal app approach:

- Mobile: iOS and Android via Expo.
- Web: Chrome and Brave through Expo web / React Native Web.
- Backend: Supabase for authentication, Postgres data, realtime sync, and row-level security.

The recommended stack is `Expo universal app + Supabase`, because it provides one TypeScript codebase for mobile and browser while keeping sync, auth, and data ownership clean.

## User Model

The app is for a single personal user who wants a dependable place for everyday execution:

- Capture something quickly.
- Finish routine daily items.
- Keep streaks alive.
- Maintain small project checklists.
- Move between phone and browser without thinking about sync.

The product should not feel like a task management system for teams. It should feel like a personal command list.

## Core Task Types

### Quick Tasks

Quick tasks are one-off tasks. They can appear on Today and can be completed once. Completion strikes the row through and updates progress immediately.

Expected fields:

- Title.
- Completion state.
- Optional due/local date.
- Creation timestamp.
- Completion timestamp.

### Daily Tasks

Daily tasks represent recurring routines or habits. They reset to incomplete at the user's local midnight.

Daily behavior:

- Completing a daily task marks it complete for the current local date.
- The task row becomes struck through for the rest of that local day.
- The streak increments when the daily task is completed for that date.
- If the task is not completed before local midnight, the streak resets to zero.
- At local midnight, the task returns to its normal incomplete state.
- If unfinished daily tasks remain at 11:00 PM local time, the app sends an end-of-day reminder.

The reminder should be aggregated when possible: for example, "You have 2 daily tasks left before reset."

### Project Tasks

Project tasks belong to a simple project checklist.

V1 project behavior:

- A project has a name and a flat list of tasks.
- Project tasks can be completed and struck through.
- Project progress is shown as completed tasks over total tasks.
- No nested subtasks or sections in V1.

## Screens

### Auth

The user can create an account, sign in, recover access, and sign out. Email/password is sufficient for V1. OAuth can be considered during implementation only if it does not slow the first release.

### Today

The default post-login screen.

Today shows:

- Daily tasks.
- Quick tasks.
- Streak badges.
- Completion progress.
- Project summary cards.
- End-of-day reset/reminder state when relevant.

Today is the emotional center of the app. It should load fast, make the next action obvious, and make completion feel immediate.

### Daily

Manage recurring daily tasks.

Daily shows:

- All daily tasks.
- Current streaks.
- Completion status for today.
- Reminder behavior.

### Projects

List all personal projects.

Each project summary shows:

- Project name.
- Remaining task count.
- Completion percentage.

### Project Detail

Shows one project's flat checklist.

Project detail supports:

- Add task.
- Complete task.
- Rename task.
- Delete task.
- Rename project.
- Delete project.

### Task Composer

The composer supports fast creation with a task type selector:

- Quick.
- Daily.
- Project task.

When creating a project task, the user chooses the project.

### Settings

Settings include:

- Account details.
- Sign out.
- Timezone display and update behavior.
- Daily reminder toggle.
- Daily reminder time, defaulting to 11:00 PM local time.

## Design Direction

Approved direction: `B Prime + Satoshi`.

The app should look like a premium personal command center:

- Dark base surfaces.
- Crisp 8px cards and panels.
- Thin high-quality borders.
- Restrained glow only where it adds focus.
- Mint/green for completed state and streak health.
- Amber for reset/reminder urgency.
- Blue for project progress.
- Satoshi as the primary font.
- Strong hierarchy with compact, readable text.

The design should avoid:

- Toy-like gamification.
- Heavy neon gradients.
- Oversized decorative cards.
- Cartoonish completion effects.
- A generic developer-dashboard look.

## Interaction Principles

- Completion is optimistic: the UI updates immediately, then syncs.
- Checkbox interaction fills the control, strikes the row, and updates progress without delay.
- Motion is subtle and fast.
- Daily reset happens silently at local midnight.
- The app should feel responsive even when the network is slow.
- Sync conflicts should prefer preserving user intent and avoiding duplicate tasks.

## Timezone and Reset Behavior

The user asked for local-midnight behavior.

Implementation assumption:

- The app stores a user timezone in the profile using an IANA timezone value.
- The app initializes the timezone from the user's device.
- Settings allows the user to refresh or update timezone behavior.
- Daily completion dates are stored as local dates relative to that user timezone.
- Reset calculations use the stored user timezone so mobile and web agree.

This keeps streaks consistent across devices.

## Data Model

Expected Supabase tables:

- `profiles`
  - `id`
  - `timezone`
  - `created_at`
  - `updated_at`

- `tasks`
  - `id`
  - `user_id`
  - `project_id`
  - `type`
  - `title`
  - `sort_order`
  - `is_archived`
  - `completed_at`
  - `created_at`
  - `updated_at`

- `projects`
  - `id`
  - `user_id`
  - `name`
  - `sort_order`
  - `is_archived`
  - `created_at`
  - `updated_at`

- `daily_completions`
  - `id`
  - `user_id`
  - `task_id`
  - `local_date`
  - `completed_at`

- `reminder_preferences`
  - `user_id`
  - `enabled`
  - `reminder_time`
  - `created_at`
  - `updated_at`

All user-owned rows must be protected with Supabase row-level security policies.

## Sync Model

The app should use Supabase as the source of truth and subscribe to realtime changes for signed-in users.

Expected behavior:

- Create, update, complete, and delete actions write to Supabase.
- The UI applies local optimistic changes first.
- Realtime events reconcile changes across devices.
- If a write fails, the app should show a clear retry state and restore the previous state when needed.

## Notification Model

Daily reminders should default to 11:00 PM local time.

V1 behavior:

- If daily reminders are enabled, the user receives one reminder one hour before reset.
- The reminder only matters when daily tasks remain unfinished.
- Mobile should use native local notifications.
- Web should use browser notifications when permission is granted, with in-app reminder state as a fallback.

Exact notification plumbing can be finalized during implementation planning.

## Acceptance Criteria

- A user can create an account and sign in on mobile and web.
- A task created on one device appears on another device automatically.
- A user can create quick tasks, daily tasks, projects, and project tasks.
- Completing any task updates the row immediately and strikes it through.
- Daily tasks reset to incomplete at the user's local midnight.
- Daily task streaks increment on completion and reset after a missed day.
- The app reminds the user at 11:00 PM local time when daily tasks remain unfinished.
- Projects show simple checklist progress.
- The UI uses the approved B Prime visual direction with Satoshi typography.
- V1 contains no collaboration or nested project structures.

## Open Decisions for Implementation Planning

- Final app name. `Anchor` was used as a visual placeholder only.
- Exact auth providers beyond email/password.
- Exact notification implementation for each platform.
- Whether quick tasks are always tied to Today or can exist as unscheduled inbox items.

These decisions should be resolved during the Superpowers writing-plans phase before implementation begins.
