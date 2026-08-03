# CURRENT.md - Donezo Hot State

## Read first

- **Project:** Donezo checklist app
- **Branch:** `codex/public-launch`
- **Current commit before this continuity update:** `60b2162`
- **GitHub repo:** `https://github.com/ManikantaVenna/donezo-checklist-app`
- **Live web app:** `https://donezo.mv-builds.com`
- **Live Android download page:** `https://donezo.mv-builds.com/download`
- **Current public Android release:** `1.0.7` build `10`
- **Current objective:** keep Donezo stable, public, resumable across fresh chats, and ready for small fixes/features.
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

For any new change, rerun the smallest relevant checks before claiming completion.

## Current state

- App is public and usable on web and Android.
- Supabase Auth is connected and uses email verification codes.
- User data is separated through Supabase row-level security.
- Friends can use the app, but if some users do not receive verification emails, inspect Resend logs for delivered/bounced/failed/no-log cases before changing app code.
- Public GitHub repo exists and tracks `codex/public-launch`.
- Working tree should be kept clean between tasks.

## Known risks / watch items

- Email OTP delivery can vary by recipient mailbox/provider. Check Resend email logs before assuming a code bug.
- Cloudflare R2 is used for permanent APK hosting. Stay within free usage; do not make expensive/destructive Cloudflare changes without clear user approval.
- Android update prompts only work for installed versions that already include the update checker.
- Releasing requires the full release order in `AGENTS.md`; do not skip it.

## Next exact task

Start a fresh chat and continue with the user's next Donezo fix or feature request. First read `AGENTS.md`, `CURRENT.md`, and `DIRECTION.md`.

## Fresh-chat opener

```text
Read AGENTS.md, CURRENT.md, and DIRECTION.md. Continue from branch codex/public-launch in C:\Users\manik\OneDrive\Documents\Donezo checklist app. Current state: Donezo is public on web/Android, GitHub is public, Android 1.0.7 build 10 is the latest released version, and future releases must update the APK plus latest.json before claiming update prompts are live. Next task: ask me which Donezo fix or feature to work on first. Do not restart the app, do not use mobile-design workflow unless I explicitly ask, and do not ask me to paste secrets in chat.
```
