# Donezo

Donezo is a premium personal checklist app built for people who want a simple command center for the day: quick tasks, daily routines, streaks, and lightweight projects in one polished dark and gold experience.

Live web browser app: https://donezo.mv-builds.com

Live download page: https://donezo.mv-builds.com/download

People who do not want to install the Android app right away can open the web version first. It runs in the browser, uses the same Donezo account, and is the safest way to try the app before downloading the APK.

## What Donezo Does

- Quick tasks for one-time work.
- Daily routines with streak tracking.
- Simple projects for grouped checklist work.
- Add, delete, reorder, and complete tasks quickly.
- Syncs each user's data privately through Supabase.
- Works on web and Android from the same account.
- Timezone-aware daily reset and reminder settings.
- Premium streak rewards with visual milestone badges.
- In-app update prompts for Android builds that include the update checker.

## Product Feel

Donezo is designed to feel calm, fast, and premium. The visual system is a dark interface with warm gold accents, a shiny Donezo mark, compact task rows, and reward-style streak badges that make daily routines feel more satisfying over time.

## Tech Stack

- Expo SDK 57
- React Native 0.86
- React 19
- Supabase Auth, Postgres, RLS, and Realtime
- Vitest and React Test Renderer
- EAS Build for Android APKs
- Cloudflare Pages for the public web/download site
- Cloudflare R2 plus a Cloudflare Worker for permanent APK hosting
- Cloudflare Workers cron plus Web Push for installable web reminders

## Repository Layout

```text
.
- checklist-app/        # Expo app, web export, Supabase migrations, tests
- release-worker/       # Cloudflare Worker that serves APK files from private R2
- reminder-worker/      # Cloudflare Worker cron for PWA Web Push reminders
- docs/superpowers/     # Planning and design notes
- AGENTS.md             # Release workflow rules for Codex
```

## App Features

Donezo currently includes:

- Email code based account flow through Supabase.
- Per-user checklist data separation with row-level security.
- Optimistic task creation, completion, delete, and reorder flows.
- Realtime sync across signed-in devices.
- Daily completion tracking and streak calculation.
- Android local daily reminder scheduling.
- PWA Web Push reminders for iPhone/Home Screen web users.
- Timezone selector with live preview.
- A public support page and privacy page.
- A permanent Android download page.
- A release manifest at `/releases/android/latest.json` for future update prompts.

## Running Locally

From `checklist-app`:

```powershell
npm install
npm run web
```

Without Supabase environment values, the app can run in demo mode with mock data.

To connect Supabase, copy:

```powershell
copy .env.example .env
```

Then set:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_WEB_PUSH_PUBLIC_KEY=
```

Do not commit real `.env` files or secret keys.

## Checks

From `checklist-app`:

```powershell
npm run typecheck
npm test
npx expo-doctor
```

From `release-worker`:

```powershell
npm run typecheck
npm test
```

From `reminder-worker`:

```powershell
npm run typecheck
npm test
npx wrangler deploy --dry-run
```

## Android Releases

The current public Android release is:

- Version: `1.0.8`
- Build: `12`
- Web browser app: https://donezo.mv-builds.com
- Download page: https://donezo.mv-builds.com/download
- APK host: https://downloads.mv-builds.com/android/Donezo-1.0.8-build-12.apk

The release manifest is published at:

```text
https://donezo.mv-builds.com/releases/android/latest.json
```

When a newer Android build is published, users on a previous build that already includes the update checker will see an in-app update prompt. The prompt opens the Donezo download page so they can install the newer APK.

## Release Safety

The APK publication order matters:

1. Build and verify the signed APK.
2. Upload the APK to Cloudflare R2.
3. Verify the public APK URL, size, hash, and range download support.
4. Deploy the download site.
5. Publish `latest.json` only after the APK is reachable.

That order prevents users from seeing an update prompt before the APK is actually available.

## Security Notes

- Supabase row-level security keeps users separated by `auth.uid()`.
- Real `.env` files are ignored by git.
- Worker secrets must be set with Wrangler or Cloudflare dashboard, not committed.
- Signing keys and binary release artifacts are ignored.
- The R2 bucket is private. APK downloads go through the Worker at `downloads.mv-builds.com`.

## License

See `checklist-app/LICENSE`.
