# CURRENT.md - Donezo Hot State

## Read first

- **Project:** Donezo checklist app
- **Branch:** `codex/public-launch`
- **Current checkpoint:** Donezo Android `1.0.8` build `12` is built, uploaded, verified, published in `latest.json`, and live on the download page. The public download page now also includes a clear iPhone/Home Screen setup guide. The Android release keeps the old left check-circle + right arrow row controls, uses the compact trash icon with Undo, preserves new-task-at-top behavior, and includes the PWA/native reminder fixes.
- **GitHub repo:** `https://github.com/ManikantaVenna/donezo-checklist-app`
- **Live web app:** `https://donezo.mv-builds.com`
- **Live Android download page:** `https://donezo.mv-builds.com/download`
- **Current public Android release:** `1.0.8` build `12`
- **Current objective:** keep Donezo stable, public, resumable across fresh chats, and ask the user to test the Android update/install path plus the final row controls.
- **Important don'ts:** do not restart the app, do not use mobile-design workflow unless explicitly asked, do not ask for secrets in chat, do not claim release/update prompts are live until APK and `latest.json` are verified live.

## What changed recently

- Built and polished Donezo as a premium dark/gold checklist app.
- Moved the project into `C:\Users\manik\OneDrive\Documents\Donezo checklist app`.
- Published the public GitHub repo at `https://github.com/ManikantaVenna/donezo-checklist-app`.
- Cleaned GitHub history so the public repo attribution shows Manikanta only, removing Claude co-author trailers from commit messages.
- Added README links for both the safe web browser app and Android download page.
- Released Android `1.0.7` build `10`.
- Released Android `1.0.8` build `12`.
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
- Implemented the approved task-ordering UI in source: new tasks now insert at the top of their own list, task rows use a left drag handle instead of up/down arrows, Delete is now a compact trash icon, tapping task text still toggles completion, daily streak badges remain, and deleting a task shows a bottom Undo bar.
- Added direct target-position reorder planning so a dragged task can be saved in one reorder write, plus undo restore/unarchive support for accidental task deletes.
- Committed and pushed task-ordering as `dd8841f feat: add drag task ordering`.
- Prepared Android release version `1.0.8` as `af9311a release: prepare Donezo 1.0.8`.
- Deployed an initial task-ordering web/PWA build to Cloudflare Pages deployment `ddd05d77.donezo-ehw.pages.dev`.
- Canceled EAS Android APK build `b06a6991-99bd-439a-9ba7-96eddc0f84ba` for Donezo `1.0.8` build `11` before any APK existed or `latest.json` changed.
- Polished the task-row design after user feedback: the drag handle is now a warm gold control, the trash action is a cleaner red icon button, and the held row lifts/follows the pointer while adjacent rows spring aside.
- Deployed the polished task-ordering web/PWA build to Cloudflare Pages deployment `1452a3e8.donezo-ehw.pages.dev`; live custom domain `https://donezo.mv-builds.com/` serves bundle `index-1ede591174a659a3e0f7e53779538773.js`.
- Stabilized task drag control after user feedback: added a tested drag dead zone so rows do not flip back and forth near boundaries, enlarged the handle touch area while preserving the gold handle look, made drag activation more deliberate, and softened edge auto-scroll.
- Deployed the drag-control stability fix to Cloudflare Pages deployment `c04fd8cd.donezo-ehw.pages.dev`; live custom domain `https://donezo.mv-builds.com/` serves bundle `index-446c0b057a27a9f80942b87c91bfdee2.js`.
- Calmed task drag control again after real-device feedback: removed the neighboring row spring/shift behavior that made the list feel like it was fighting the finger, kept only the held row moving during drag, made the drop threshold responsive but stable, kept the larger handle, and made edge auto-scroll gentler.
- Committed and pushed the calmer drag-control fix as `175b691 fix: calm drag reorder controls`.
- Deployed the calmer drag-control web/PWA build to Cloudflare Pages deployment `c24d72e4.donezo-ehw.pages.dev`; live custom domain `https://donezo.mv-builds.com/` serves bundle `index-d0b7b6902c4be647c30f3797448629a0.js`.
- Reverted away from the drag/grip UI after user testing: task rows again use the old left check circle and right up/down arrows, Delete remains the newer compact trash icon, delete Undo is preserved, and new tasks still insert at the top.
- Removed the now-unused `ReorderableTaskList` and `dragTarget` helper/test files.
- Committed and pushed the row-control restore as `67d78e6 fix: restore arrow task controls`.
- Deployed the restored arrow-control web/PWA build to Cloudflare Pages deployment `e9258f2d.donezo-ehw.pages.dev`; live custom domain `https://donezo.mv-builds.com/` serves bundle `index-e8dda6aae1390ea54ffdab5d68e93733.js`.
- Aligned Expo SDK patch versions, verified Expo Doctor, and committed/pushed the release source as `1ea1f0e chore: align Expo SDK patches`.
- Built EAS Android APK `d91d7e46-3fce-4bbf-bb3b-6b1cea6410aa` from source commit `1ea1f0eca51a0264ea625316fbe222ee5086868f`; EAS assigned app version `1.0.8` and build version `12`.
- Uploaded `Donezo-1.0.8-build-12.apk` to Cloudflare R2 at `https://downloads.mv-builds.com/android/Donezo-1.0.8-build-12.apk`.
- Published `latest.json` for Android `1.0.8` build `12` and deployed Cloudflare Pages production deployment `47ca4f09-fe40-4df4-be6e-5ab034925676` (`https://47ca4f09.donezo-ehw.pages.dev`).
- Verified the live download page shows Version `1.0.8`, Build `12`, SHA-256 `1ca27735788fa870271eb76c352c20c5449ab5473c25639999dbc5c22a99e6c0`, and its button points to the new APK.
- Added a separate iPhone guide to the public download page: it explains there is no iPhone APK, Donezo works almost exactly like an app from the Home Screen, and users should add Donezo from Safari before enabling web reminders.

## Latest public release details

- **Version:** `1.0.8`
- **Build:** `12`
- **APK:** `https://downloads.mv-builds.com/android/Donezo-1.0.8-build-12.apk`
- **APK size:** `37,617,372` bytes
- **SHA-256:** `1ca27735788fa870271eb76c352c20c5449ab5473c25639999dbc5c22a99e6c0`
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

Current task-ordering work was verified with:

- `npm run typecheck` in `checklist-app`
- `npm test` in `checklist-app` -> 21 files / 179 tests passed
- `npm run build:web` in `checklist-app`
- Cloudflare Pages deploy from `checklist-app/dist` -> deployment `https://ddd05d77.donezo-ehw.pages.dev`
- Refined task-row polish verified with a no-secrets demo web export plus Playwright/Chrome desktop and mobile screenshots in `output/playwright/`
- Playwright/Chrome drag probe confirmed the row lifts and follows the pointer while the neighboring row shifts aside
- Cloudflare Pages deploy from `checklist-app/dist` -> deployment `https://1452a3e8.donezo-ehw.pages.dev`
- Live `https://donezo.mv-builds.com/` and preview deployment both serve `index-1ede591174a659a3e0f7e53779538773.js`
- Live `https://donezo.mv-builds.com/releases/android/latest.json` intentionally still points to Android `1.0.7` build `10` until the new APK is built, uploaded, and verified.
- Task drag control fix verified with `npm test -- src/domain/dragTarget.test.ts`, `npm test -- src/domain/dragTarget.test.ts src/components/TaskRow.test.tsx`, `npm run typecheck`, `npm test` -> 22 files / 182 tests passed, `npm run build:web`, and a no-secrets Playwright/Chrome mobile drag probe.
- Cloudflare Pages deploy from `checklist-app/dist` -> deployment `https://c04fd8cd.donezo-ehw.pages.dev`
- Live `https://donezo.mv-builds.com/` and preview deployment both serve `index-446c0b057a27a9f80942b87c91bfdee2.js`
- Calmer drag-control fix verified with `npm test -- src/domain/dragTarget.test.ts` failing before the threshold change, then `npm test -- src/domain/dragTarget.test.ts src/components/TaskRow.test.tsx` -> 2 files / 5 tests passed, `npm run typecheck`, `npm test` -> 22 files / 183 tests passed, `npm run build:web`, and a no-secrets Chrome mobile drag probe that moved `Morning stretch` below `Read 20 minutes` without neighbor rows shifting during drag.
- Cloudflare Pages deploy from `checklist-app/dist` -> deployment `https://c24d72e4.donezo-ehw.pages.dev`
- Live `https://donezo.mv-builds.com/` and preview deployment both serve `index-d0b7b6902c4be647c30f3797448629a0.js`
- Live `https://donezo.mv-builds.com/releases/android/latest.json` intentionally still points to Android `1.0.7` build `10` until the new APK is built, uploaded, and verified.
- Arrow-control restore verified with a red/green `npm test -- src/components/TaskRow.test.tsx`, `npm run typecheck`, `npm test` -> 21 files / 179 tests passed, `npm run build:web`, and a no-secrets Chrome mobile screenshot at `output/playwright/arrow-row-restored-mobile.png` showing the left check circle, right arrows, and trash icon.
- Cloudflare Pages deploy from `checklist-app/dist` -> deployment `https://e9258f2d.donezo-ehw.pages.dev`
- Live `https://donezo.mv-builds.com/` and preview deployment both serve `index-e8dda6aae1390ea54ffdab5d68e93733.js`
- Live bundle no longer contains the old drag strings (`Drag to move this task`, `ReorderableTaskList`) and still contains the arrow/delete action strings.
- Android release `1.0.8` build `12` verified with `npx expo-doctor`, `npm run typecheck`, `npm test` -> 21 files / 179 tests passed, `npm run build:web`, EAS build `d91d7e46-3fce-4bbf-bb3b-6b1cea6410aa`, remote R2 upload, APK HEAD/range/hash checks, live manifest checks, and a Playwright browser check of the download page.
- Live APK checks for `https://downloads.mv-builds.com/android/Donezo-1.0.8-build-12.apk`: HEAD `200`, `Content-Length` `37617372`, content type `application/vnd.android.package-archive`, range `206` for `bytes 0-1023/37617372`, downloaded size `37617372`, SHA-256 `1ca27735788fa870271eb76c352c20c5449ab5473c25639999dbc5c22a99e6c0`.
- Live `https://donezo.mv-builds.com/releases/android/latest.json` returns Android `1.0.8` build `12`; build `10` sees it as newer and build `12` does not.
- Live `https://donezo.mv-builds.com/download/` shows Version `1.0.8`, Build `12`, and links its download button to the new APK.
- Download-page iPhone guide verified with red/green `npm test -- public/download-page.test.ts`, `npm run typecheck`, `npm test` -> 23 files / 181 tests passed, and `npm run build:web`.

For any new change, rerun the smallest relevant checks before claiming completion.

## Current state

- App is public and usable on web and Android.
- Supabase Auth is connected and uses email verification codes.
- User data is separated through Supabase row-level security.
- Friends can use the app, but if some users do not receive verification emails, inspect Resend logs for delivered/bounced/failed/no-log cases before changing app code.
- Public GitHub repo exists and tracks `codex/public-launch`.
- PWA Web Push reminders are live for signed-in web users who add Donezo to the iPhone Home Screen, open it from that icon, enable web reminders in Settings, and allow notifications.
- The public download page includes a separate iPhone/Home Screen setup guide for Apple users.
- PWA Web Push server delivery now has a 5-minute after-time retry window and private delivery records, so a slightly delayed cron run should still send once if daily routines remain unfinished.
- Production closed-app server delivery to Apple is verified as of `2026-08-04`: the Worker reached Apple Push and recorded `sent` for an unfinished New York iPhone reminder.
- User has confirmed the reminder behavior appears to be working in real use.
- Task-ordering improvements are implemented, verified, committed, pushed, and live for web/PWA users on `donezo.mv-builds.com`.
- Current task row ordering uses old-style arrow controls, not drag/grip controls.
- Android `1.0.8` build `12` is the current public APK and live manifest release. Users on Android build `10` should see the update prompt because `latest.json` now advertises build `12`; older APKs before build `10` still cannot show update prompts because they do not contain the checker.
- Android native reminder guard changes are now included in the public Android `1.0.8` build `12` APK.
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

Ask the user to check the live download page's new iPhone section, test the Android `1.0.8` build `12` update/install path, confirm the final row controls/new-task-at-top behavior on Android, and then choose the next Donezo fix or feature.

## Fresh-chat opener

```text
Read AGENTS.md, CURRENT.md, and DIRECTION.md. Continue from branch codex/public-launch in C:\Users\manik\OneDrive\Documents\Donezo checklist app. Current state: Donezo Android 1.0.8 build 12 is the latest public APK/latest.json release, live at https://donezo.mv-builds.com/download with APK https://downloads.mv-builds.com/android/Donezo-1.0.8-build-12.apk. The public download page also has a separate iPhone/Home Screen setup guide explaining that iPhone users do not use APKs and should add Donezo from Safari before enabling web reminders. PWA Web Push reminders are deployed and verified. Task ordering is final: new tasks insert at the top, rows use the old left check circle and right up/down arrow controls, Delete is a compact trash icon, and task delete has a bottom Undo bar; drag/grip reorder was removed after user testing. Next task: ask the user to check the live iPhone download-page section, test the Android 1.0.8 update/install path and final row controls, then choose the next Donezo fix or feature. Do not restart the app, do not use mobile-design workflow unless explicitly asked, do not ask me to paste secrets in chat, and do not claim future Android update prompts are live until that future APK/latest.json are verified.
```
