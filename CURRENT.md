# CURRENT.md - Donezo Hot State

## Read first

- **Project:** Donezo checklist app
- **Branch:** `codex/public-launch`
- **Current commit before task-ordering planning:** `19ec886`
- **GitHub repo:** `https://github.com/ManikantaVenna/donezo-checklist-app`
- **Live web app:** `https://donezo.mv-builds.com`
- **Live Android download page:** `https://donezo.mv-builds.com/download`
- **Current public Android release:** `1.0.7` build `10`
- **Current objective:** keep Donezo stable, public, resumable across fresh chats, and improve task ordering so new tasks appear at the top and existing tasks are easy to rearrange.
- **Important don'ts:** do not restart the app, do not use mobile-design workflow unless explicitly asked, do not ask for secrets in chat, do not claim release/update prompts are live until APK and `latest.json` are verified live.

## What changed recently

- Built and polished Donezo as a premium dark/gold checklist app.
- Moved the project into `C:\Users\manik\OneDrive\Documents\Donezo checklist app`.
- Published the public GitHub repo at `https://github.com/ManikantaVenna/donezo-checklist-app`.
- Cleaned GitHub history so the public repo attribution shows Manikanta only, removing Claude co-author trailers from commit messages.
- Added README links for both the safe web browser app and Android download page.
- Released Android `1.0.7` build `10`.
- Hosted APK downloads permanently through Cloudflare R2 + Worker at `downloads.mv-builds.com`.
- Hosted the web/download site through Cloudflare Pages at `donezo.mv-builds.com`.
- Added in-app Android update checking so users on build `10+` can see future update prompts.
- Added premium streak badge images and compact rendering.
- Fixed major task sync races: optimistic add/toggle/delete/reorder flows, stale refresh protection, pending ID guards, realtime startup refresh, and atomic reorder RPC.
- Fixed safe-area/navigation-button layout issues on Android.
- Fixed long task title wrapping/cutoff.
- Improved mobile local reminders and timezone clock refresh behavior.
- Added and deployed PWA Web Push reminders for iPhone/Home Screen web users.
- Changed reminder scheduling so Donezo only schedules/sends reminders when at least one active daily routine is unfinished for the user's selected local date.
- Added `reminder-worker/`, a Cloudflare Worker cron source that checks each user's saved IANA timezone and `HH:mm` reminder time every minute.
- Deployed `donezo-reminders` as a scheduled-only Cloudflare Worker with cron `* * * * *`.
- Deployed a Cloudflare Pages production deployment for the PWA files on branch `codex/public-launch`.
- Fixed the web build script to run Expo export with `--clear` so stale Metro cache cannot omit `EXPO_PUBLIC_WEB_PUSH_PUBLIC_KEY` from the deployed bundle.
- Hardened iPhone/Home Screen PWA reminder delivery so the Worker checks a short retry window after the selected reminder minute, stores private delivery records, and avoids duplicate successful sends for the same subscription/local date/time.
- Fixed a closed-app PWA reminder outage where an invisible BOM/whitespace character in Worker env values made Supabase reject the Worker API key before any delivery attempt could be recorded.
- Hardened the PWA service worker notification display by giving each reminder a unique notification tag, enabling `renotify` where supported, and registering the service worker through a versioned URL to bypass sticky custom-domain cache.
- User reported the iPhone/Home Screen reminder fix appears to be working and asked to save that state.

## Latest public release details

- **Version:** `1.0.7`
- **Build:** `10`
- **APK:** `https://downloads.mv-builds.com/android/Donezo-1.0.7-build-10.apk`
- **APK size:** `37,594,996` bytes
- **SHA-256:** `4f907ff9991655fe5be310c072f14a4177f05eaa208101684367bbf9822c6062`
- **Manifest:** `https://donezo.mv-builds.com/releases/android/latest.json`
- **Download page:** `https://donezo.mv-builds.com/download`
- **Bridge limitation:** users must have build `10` or newer before future in-app update prompts can appear. Older APKs cannot show a prompt because they do not contain the update checker.

## Verification evidence from recent work

Recent work has been verified at different checkpoints with:

- `npm run typecheck` in `checklist-app`
- `npm test` in `checklist-app`
- `npx expo-doctor`
- Android production export/build checks
- `npm run typecheck` and `npm test` in `release-worker`
- Live checks for download page, `latest.json`, APK HEAD/range download support, file size, and SHA-256 match
- GitHub remote/contributor check after cleaning attribution

Current PWA reminder work was verified with:

- `npm test` in `checklist-app` -> 21 files / 172 tests passed
- `npm run typecheck` in `checklist-app`
- `npx expo export --platform web --output-dir .expo-web-smoke` in `checklist-app`; output includes `manifest.webmanifest`, `donezo-service-worker.js`, and PWA icons
- `npm run build:web` in `checklist-app`
- `npm test` in `reminder-worker` -> 1 file / 4 tests passed
- `npm run typecheck` in `reminder-worker`
- `npx wrangler deploy --dry-run` in `reminder-worker`
- Supabase live checks: `web_push_subscriptions` has RLS enabled; reminder RPC migration and cleanup migration are recorded; invalid worker token returns zero due reminder rows.
- Supabase live checks for reminder reliability migration: `private.web_push_reminder_deliveries` exists, RLS is enabled, the 3-argument `get_due_web_push_reminders` RPC exists, and `record_web_push_reminder_delivery` exists.
- Supabase security advisor: only expected warnings for token-guarded public `SECURITY DEFINER` RPCs plus unrelated leaked-password-protection setting.
- Cloudflare Worker `donezo-reminders` deploy version `6d8a44d9-2752-49ef-9853-5f231ec47000` is live with cron `* * * * *`.
- Cloudflare Worker secrets are set for `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `REMINDER_WORKER_TOKEN`, `WEB_PUSH_PUBLIC_KEY`, and `WEB_PUSH_PRIVATE_KEY`.
- Cloudflare Pages production deployment is live on branch `codex/public-launch`; verify the current deployment ID with `npx wrangler pages deployment list --project-name donezo` when needed.
- Live checks for `https://donezo.mv-builds.com/`, `/manifest.webmanifest`, `/donezo-service-worker.js`, and `/icons/donezo-1024.png` returned `200`; manifest is JSON and service worker is JavaScript with notification handling.
- Local clean export check confirmed `dist/_expo/static/js/web/index-73c0ffd16633168b24dc2949a4c9ddfc.js` contains the configured web-push public key.
- Cloudflare Pages production deployment `075d5085-7459-47be-859e-2e9a1a076d68` source `32fb166` served the fixed bundle; live `https://donezo.mv-builds.com/` now points to `index-73c0ffd16633168b24dc2949a4c9ddfc.js`, and that live bundle contains the web-push public key.
- Reminder reliability update verified with `npm test`, `npm run typecheck`, and `npx wrangler deploy --dry-run` in `reminder-worker`; `npx wrangler deploy` published version `6d8a44d9-2752-49ef-9853-5f231ec47000`; `npx wrangler versions list` and `npx wrangler deployments list` show that version deployed at 100%.
- Closed-app reminder fix verified with `npm test` and `npm run typecheck` in `reminder-worker`; Wrangler scheduled-test reproduced the pre-fix Supabase API-key failure and returned `200 OK` after env normalization.
- `npx wrangler deploy` in `reminder-worker` published Worker version `d5592f89-dba1-4439-a4ac-128880146c3e` with cron `* * * * *`.
- Live Supabase delivery check recorded an Apple Web Push `sent` delivery for the New York iPhone subscription at `2026-08-04 17:56:52 UTC` for local reminder time `13:56`, proving the production Worker now sends to Apple when an unfinished daily routine is due.
- PWA display hardening verified with `node --check public/donezo-service-worker.js`, `npm run typecheck`, `npm test` -> 21 files / 172 tests passed, and `npm run build:web` in `checklist-app`.
- Cloudflare Pages production deployment `f81ddcb7-0c0e-46e6-9fc9-7c8ce9d7aec9` is live on branch `codex/public-launch`; live `https://donezo.mv-builds.com/` now points to `index-ac234f6c2f7531372fd83fdb76123026.js`, and that bundle registers `/donezo-service-worker.js?v=20260804-reminders`.
- Live `https://donezo.mv-builds.com/donezo-service-worker.js` and the versioned service-worker URL both serve the hardened handler with unique reminder tags and `renotify: true`.

For any new change, rerun the smallest relevant checks before claiming completion.

## Current state

- App is public and usable on web and Android.
- Supabase Auth is connected and uses email verification codes.
- User data is separated through Supabase row-level security.
- Friends can use the app, but if some users do not receive verification emails, inspect Resend logs for delivered/bounced/failed/no-log cases before changing app code.
- Public GitHub repo exists and tracks `codex/public-launch`.
- PWA Web Push reminders are live for signed-in web users who add Donezo to the iPhone Home Screen, open it from that icon, enable web reminders in Settings, and allow notifications.
- PWA Web Push server delivery now has a 5-minute after-time retry window and private delivery records, so a slightly delayed cron run should still send once if daily routines remain unfinished.
- Production closed-app server delivery to Apple is verified as of `2026-08-04`: the Worker reached Apple Push and recorded `sent` for an unfinished New York iPhone reminder.
- User has confirmed the reminder behavior appears to be working in real use.
- Android native reminder guard changes are in source only until the next APK release; do not say Android APK users have that native fix until a new APK and `latest.json` are published.
- PWA reminder source/docs belong to the current checkpoint; keep the tree clean after committing.

## Known risks / watch items

- Email OTP delivery can vary by recipient mailbox/provider. Check Resend email logs before assuming a code bug.
- Cloudflare R2 is used for permanent APK hosting. Stay within free usage; do not make expensive/destructive Cloudflare changes without clear user approval.
- Android update prompts only work for installed versions that already include the update checker.
- Releasing requires the full release order in `AGENTS.md`; do not skip it.
- iPhone browser-tab reminders are still not the reliable path; users should install Donezo to the Home Screen and enable reminders from that installed web app.
- Exact closed-app notification display still needs user/device confirmation after opening the Home Screen app once so iOS fetches the versioned service worker; if Apple records `sent` but no banner appears, check iPhone notification settings for Donezo, Focus/Silent mode, Notification Center, and whether an old Home Screen install needs to be removed/re-added.
- The live service-worker URL serves JavaScript correctly but Cloudflare still reports `max-age=14400`; the app now registers a versioned service-worker URL to bypass stale custom-domain cache.
- If Donezo says "Web reminders are not configured on this Donezo build yet," check whether the live web bundle contains `EXPO_PUBLIC_WEB_PUSH_PUBLIC_KEY`; the `build:web` script now uses `--clear` to avoid stale Metro env caching.
- `npx wrangler types --check` is not usable with the current hand-written `reminder-worker/worker-configuration.d.ts`; normal Worker typecheck and dry-run pass.

## Next exact task

Confirm the task-ordering approach with the user, then implement it narrowly: new tasks should appear at the top of their list, and existing tasks should get an easier way to jump/rearrange without tapping one-step arrows repeatedly.

## Fresh-chat opener

```text
Read AGENTS.md, CURRENT.md, and DIRECTION.md. Continue from branch codex/public-launch in C:\Users\manik\OneDrive\Documents\Donezo checklist app. Current state: PWA Web Push reminders are deployed for iPhone/Home Screen web users, the Worker fix is live as deploy version `d5592f89-dba1-4439-a4ac-128880146c3e`, Supabase recorded Apple `sent`, and the user says the reminder fix appears to be working. Android 1.0.7 build 10 remains the latest APK, and Android native reminder source changes still need a future APK plus latest.json release before Android users get them. Next task: confirm and implement the task-ordering improvement: new tasks should appear at the top, and existing tasks should be easier to move/jump/rearrange without repeated one-step arrow taps. Do not restart the app, do not use mobile-design workflow unless explicitly asked, do not ask me to paste secrets in chat, and do not claim Android update prompts are live until APK/latest.json are verified.
```
