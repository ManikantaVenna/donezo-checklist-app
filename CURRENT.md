# CURRENT.md - Donezo Hot State

## Read first

- **Project:** Donezo checklist app
- **Branch:** `codex/public-launch`
- **Current commit before this continuity update:** `d2f5750`
- **GitHub repo:** `https://github.com/ManikantaVenna/donezo-checklist-app`
- **Live web app:** `https://donezo.mv-builds.com`
- **Live Android download page:** `https://donezo.mv-builds.com/download`
- **Current public Android release:** `1.0.7` build `10`
- **Current objective:** keep Donezo stable, public, resumable across fresh chats, and verify PWA reminders on a real iPhone Home Screen install.
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
- Supabase security advisor: only expected warnings for token-guarded public `SECURITY DEFINER` RPCs plus unrelated leaked-password-protection setting.
- Cloudflare Worker `donezo-reminders` deploy version `b6241ddb-8ddc-4c1f-a161-6e7d5fea6acf` is live with cron `* * * * *`.
- Cloudflare Worker secrets are set for `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `REMINDER_WORKER_TOKEN`, `WEB_PUSH_PUBLIC_KEY`, and `WEB_PUSH_PRIVATE_KEY`.
- Cloudflare Pages production deployment is live on branch `codex/public-launch`; verify the current deployment ID with `npx wrangler pages deployment list --project-name donezo` when needed.
- Live checks for `https://donezo.mv-builds.com/`, `/manifest.webmanifest`, `/donezo-service-worker.js`, and `/icons/donezo-1024.png` returned `200`; manifest is JSON and service worker is JavaScript with notification handling.
- Local clean export check confirmed `dist/_expo/static/js/web/index-73c0ffd16633168b24dc2949a4c9ddfc.js` contains the configured web-push public key.
- Cloudflare Pages production deployment `075d5085-7459-47be-859e-2e9a1a076d68` source `32fb166` served the fixed bundle; live `https://donezo.mv-builds.com/` now points to `index-73c0ffd16633168b24dc2949a4c9ddfc.js`, and that live bundle contains the web-push public key.

For any new change, rerun the smallest relevant checks before claiming completion.

## Current state

- App is public and usable on web and Android.
- Supabase Auth is connected and uses email verification codes.
- User data is separated through Supabase row-level security.
- Friends can use the app, but if some users do not receive verification emails, inspect Resend logs for delivered/bounced/failed/no-log cases before changing app code.
- Public GitHub repo exists and tracks `codex/public-launch`.
- PWA Web Push reminders are live for signed-in web users who add Donezo to the iPhone Home Screen, open it from that icon, enable web reminders in Settings, and allow notifications.
- Android native reminder guard changes are in source only until the next APK release; do not say Android APK users have that native fix until a new APK and `latest.json` are published.
- PWA reminder source/docs belong to the current checkpoint; keep the tree clean after committing.

## Known risks / watch items

- Email OTP delivery can vary by recipient mailbox/provider. Check Resend email logs before assuming a code bug.
- Cloudflare R2 is used for permanent APK hosting. Stay within free usage; do not make expensive/destructive Cloudflare changes without clear user approval.
- Android update prompts only work for installed versions that already include the update checker.
- Releasing requires the full release order in `AGENTS.md`; do not skip it.
- iPhone browser-tab reminders are still not the reliable path; users should install Donezo to the Home Screen and enable reminders from that installed web app.
- Exact notification delivery still needs a real iPhone Home Screen test with notification permission allowed, Focus modes not blocking Donezo, and at least one unfinished daily routine at the selected local reminder minute.
- The live service-worker URL serves JavaScript correctly. Cloudflare custom-domain cache reported `max-age=14400` on the plain service-worker URL even though the latest deployment URL has the intended `no-cache` header; monitor on the next deploy.
- If Donezo says "Web reminders are not configured on this Donezo build yet," check whether the live web bundle contains `EXPO_PUBLIC_WEB_PUSH_PUBLIC_KEY`; the `build:web` script now uses `--clear` to avoid stale Metro env caching.
- `npx wrangler types --check` is not usable with the current hand-written `reminder-worker/worker-configuration.d.ts`; normal Worker typecheck and dry-run pass.

## Next exact task

On the iPhone Home Screen app, force close and reopen Donezo so it loads the fixed web bundle. Then go to Settings, tap Enable web reminders, allow notifications, leave one daily routine unfinished, and wait for the selected local reminder minute. If it still says web reminders are not configured, delete the Home Screen icon, add it again from Safari, and retest.

## Fresh-chat opener

```text
Read AGENTS.md, CURRENT.md, and DIRECTION.md. Continue from branch codex/public-launch in C:\Users\manik\OneDrive\Documents\Donezo checklist app. Current state: PWA Web Push reminders are deployed for iPhone/Home Screen web users, `donezo-reminders` cron is live, Android 1.0.7 build 10 remains the latest APK, and Android native reminder source changes still need a future APK plus latest.json release before Android users get them. Next task: test exact-time reminders on a real iPhone Home Screen install and inspect Supabase/Worker logs if the notification does not arrive. Do not restart the app, do not use mobile-design workflow unless explicitly asked, do not ask me to paste secrets in chat, and do not claim Android update prompts are live until APK/latest.json are verified.
```
