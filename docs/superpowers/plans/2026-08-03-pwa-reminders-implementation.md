# PWA Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add no-Apple-fee PWA reminders for iPhone/web users and tighten native reminders so they only fire for unfinished daily routines at the user's selected local time.

**Architecture:** The app owns subscription setup and per-user reminder preferences. Supabase stores web push subscriptions with RLS. A Cloudflare Worker cron runs every minute, evaluates each user's saved timezone/reminder minute, and sends Web Push only when active daily routines are unfinished.

**Tech Stack:** Expo React Native Web, Supabase Postgres/RLS, Cloudflare Workers cron, Web Push Push API, service workers, Vitest, TypeScript.

## Global Constraints

- Do not restart the app.
- Do not use mobile-design workflow.
- Do not ask for secrets in chat.
- Do not expose Supabase secret/service role keys in browser code; the Worker should use a Supabase publishable key plus a private worker token.
- Reminders must use each user's saved IANA timezone and `HH:mm` reminder time.
- Reminders must not send when every active daily routine is completed for that user's local date.
- Future public app releases must update APK plus `latest.json` before claiming update prompts are live.

---

### Task 1: Native Reminder Guard

**Files:**
- Modify: `checklist-app/src/lib/reminders.ts`
- Modify: `checklist-app/src/lib/reminders.test.ts`

**Interfaces:**
- Consumes: `scheduleDailyReminder(unfinishedCount, enabled, reminderTime, timezone)`
- Produces: same signature, with `unfinishedCount <= 0` cancelling pending reminders and scheduling nothing.

- [ ] **Step 1: Write the failing test**

```ts
it("does not schedule an enabled reminder when no daily task is unfinished", async () => {
  await scheduleDailyReminder(0, true, "19:06", "America/New_York");

  expect(notificationMocks.scheduleNotificationAsync).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/reminders.test.ts`

- [ ] **Step 3: Write minimal implementation**

In `scheduleDailyReminderForSequence`, return after calculating/cancelling if `!enabled`, `unfinishedCount <= 0`, or no next reminder date.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/reminders.test.ts`

### Task 2: Web Push Subscription Contract

**Files:**
- Modify: `checklist-app/src/data/checklistRepository.ts`
- Modify: `checklist-app/src/data/supabaseChecklistRepository.ts`
- Modify: `checklist-app/src/data/supabaseChecklistRepository.test.ts`
- Modify: `checklist-app/src/data/mockChecklistRepository.ts`
- Modify: `checklist-app/src/domain/types.ts`

**Interfaces:**
- Produces: `WebPushSubscriptionInput` with `endpoint`, `p256dh`, `auth`, and optional `userAgent`.
- Produces repository methods `saveWebPushSubscription(userId, input)` and `deleteWebPushSubscription(userId, endpoint)`.

- [ ] **Step 1: Write failing repository tests**

Add tests that assert `saveWebPushSubscription` upserts `endpoint`, `p256dh`, `auth`, and `user_agent`, and `deleteWebPushSubscription` deletes by `user_id` plus `endpoint`.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/data/supabaseChecklistRepository.test.ts`

- [ ] **Step 3: Implement repository methods**

Use Supabase client `.from("web_push_subscriptions").upsert(...)` and `.delete().eq("user_id", userId).eq("endpoint", endpoint)`.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- src/data/supabaseChecklistRepository.test.ts`

### Task 3: PWA Client Setup

**Files:**
- Create: `checklist-app/src/lib/webPush.ts`
- Create: `checklist-app/src/lib/webPush.test.ts`
- Create: `checklist-app/public/donezo-service-worker.js`
- Create: `checklist-app/public/manifest.webmanifest`
- Modify: `checklist-app/App.tsx`
- Modify: `checklist-app/src/screens/SettingsScreen.tsx`

**Interfaces:**
- Produces: `getWebPushSupport()`, `registerDonezoServiceWorker()`, `subscribeToWebPush(publicKey)`, `normalizePushSubscription(subscription)`.
- Settings calls repository methods through `useChecklist`.

- [ ] **Step 1: Write failing web push tests**

Test base64url public key conversion and subscription normalization from `PushSubscription.toJSON()`.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/lib/webPush.test.ts`

- [ ] **Step 3: Implement web push helpers**

Register `/donezo-service-worker.js`; require `serviceWorker`, `PushManager`, `Notification`, and a configured public VAPID key; request permission only from the button flow.

- [ ] **Step 4: Add service worker**

Handle `push` by showing a notification and `notificationclick` by opening `/`.

- [ ] **Step 5: Add Settings UI**

Add a web-only setup panel that enables web reminders, saves the subscription, and explains iPhone Home Screen requirements.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- src/lib/webPush.test.ts`

### Task 4: Supabase Migration

**Files:**
- Create: `checklist-app/supabase/migrations/<generated>_add_web_push_subscriptions.sql`

**Interfaces:**
- Produces table `public.web_push_subscriptions` and RLS policies.

- [ ] **Step 1: Create migration file**

Run: `npx supabase migration new add_web_push_subscriptions`

- [ ] **Step 2: Write migration SQL**

Create table, updated-at trigger, index on `user_id`, enable RLS, and policies scoped to `(select auth.uid()) = user_id`.

- [ ] **Step 3: Review security**

Ensure no service role key appears in migration or app code.

### Task 5: Reminder Worker

**Files:**
- Create: `reminder-worker/package.json`
- Create: `reminder-worker/tsconfig.json`
- Create: `reminder-worker/wrangler.jsonc`
- Create: `reminder-worker/src/index.ts`
- Create: `reminder-worker/src/reminders.ts`
- Create: `reminder-worker/src/reminders.test.ts`
- Create: `reminder-worker/.gitignore`

**Interfaces:**
- Produces scheduled Worker `scheduled(controller, env, ctx)`.
- Produces `findDueReminderUsers(now, rows)` and `dailyTasksNeedReminder(user, todayLocalDate)` helpers.

- [ ] **Step 1: Write failing worker tests**

Test that a user in `Asia/Kolkata` with `17:00` is due when the UTC instant is `11:30`, not due at `11:29`, and receives no push when all daily routines are complete.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test` in `reminder-worker`.

- [ ] **Step 3: Implement worker**

Use `@supabase/supabase-js` with `SUPABASE_PUBLISHABLE_KEY` plus `REMINDER_WORKER_TOKEN`, `web-push` with VAPID env, one-minute cron, structured logs, and token-guarded RPC deletion for `404`/`410`.

- [ ] **Step 4: Run worker tests and typecheck**

Run: `npm test` and `npm run typecheck` in `reminder-worker`.

### Task 6: Verification And Memory

**Files:**
- Modify: `CURRENT.md`
- Modify: `INDEX.md`
- Modify: `README.md` if reminder docs need updating.

**Interfaces:**
- Produces handoff notes explaining that PWA reminders require migration, Worker secrets, Worker deploy, and web deploy before live use.

- [ ] **Step 1: Run app checks**

Run: `npm run typecheck` and `npm test` in `checklist-app`.

- [ ] **Step 2: Run worker checks**

Run: `npm run typecheck` and `npm test` in `reminder-worker`.

- [ ] **Step 3: Run diff check**

Run: `git diff --check`.

- [ ] **Step 4: Update memory**

Record what changed, what was verified, and exact deploy/release follow-up.
