# INDEX.md - Donezo Project Map

## Brain / state

- `AGENTS.md` - router for future Codex chats; includes release rules.
- `CURRENT.md` - hot state, current release, verification evidence, next task, fresh-chat opener.
- `DIRECTION.md` - durable product direction, decisions, and "do not re-litigate" context.
- `INDEX.md` - this file map.
- `README.md` - public GitHub overview.

## Main app

- `checklist-app/` - Expo/React Native app.
- `checklist-app/App.tsx` - app shell and navigation.
- `checklist-app/src/screens/` - auth, today, daily, projects, settings screens.
- `checklist-app/src/components/` - shared UI components including task rows, drag reorder list, undo toast, buttons, streak badges, update notice.
- `checklist-app/src/hooks/useTaskDeleteUndo.ts` - task delete snackbar/undo timing shared by Today and Projects.
- `checklist-app/src/state/ChecklistContext.tsx` - checklist state, optimistic updates, delete undo restore, drag reorder persistence, refresh/realtime reconciliation.
- `checklist-app/src/state/AppUpdateContext.tsx` - Android update prompt state.
- `checklist-app/src/data/supabaseChecklistRepository.ts` - Supabase checklist persistence.
- `checklist-app/src/data/mockChecklistRepository.ts` - demo/mock persistence.
- `checklist-app/src/domain/` - dates, reminders, target-position task ordering, sorting, streak tiers, release parsing, timezones.
- `checklist-app/src/lib/` - Supabase client, reminders integration, app release checks, version helpers.
- `checklist-app/src/lib/webPush.ts` - browser PWA/Web Push support helpers and versioned service-worker registration.
- `checklist-app/assets/` - icons, logo, splash, fonts, streak badge images.
- `checklist-app/public/` - web static pages, PWA manifest/service worker/icons, `_headers`, download page, privacy/support pages, release manifest.
- `checklist-app/supabase/migrations/` - Supabase schema, indexes, reorder RPC, policy migrations.

## Release/download infrastructure

- `release-worker/` - Cloudflare Worker serving private R2 APK objects.
- `release-worker/src/index.ts` - Worker request handling.
- `release-worker/src/release.ts` - release file/path logic.
- `release-worker/wrangler.jsonc` - Cloudflare Worker config.
- `checklist-app/public/download/index.html` - public Android download page.
- `checklist-app/public/download.js` - download page behavior.
- `checklist-app/public/releases/android/latest.json` - Android update manifest.
- `reminder-worker/` - Cloudflare Worker cron for PWA Web Push reminders.
- `reminder-worker/src/reminders.ts` - reminder due-time filtering, unfinished daily checks, Worker env normalization, push sending, dead subscription cleanup.
- `reminder-worker/wrangler.jsonc` - one-minute cron trigger and Worker config.
- `checklist-app/supabase/migrations/20260803181500_add_web_push_delivery_records.sql` - private PWA delivery records, retry-window due RPC, and delivery-record RPC.

## Design/plans

- `docs/superpowers/specs/2026-07-17-checklist-app-design.md` - original app design spec.
- `docs/superpowers/plans/2026-07-17-checklist-app-implementation.md` - original implementation plan.
- `docs/superpowers/specs/2026-07-19-streak-rewards-and-app-updates-design.md` - streak rewards/update system design.
- `docs/superpowers/plans/2026-07-19-streak-rewards-and-app-updates-implementation.md` - streak rewards/update implementation plan.
- `docs/superpowers/specs/2026-08-03-pwa-reminders-design.md` - PWA/Web Push reminders design.
- `docs/superpowers/plans/2026-08-03-pwa-reminders-implementation.md` - PWA/Web Push reminders implementation plan.

## Tests / verification

From `checklist-app/`:

```powershell
npm run typecheck
npm test
npx expo-doctor
npx expo export --platform web --output-dir .expo-web-smoke
```

From `release-worker/`:

```powershell
npm run typecheck
npm test
```

From `reminder-worker/`:

```powershell
npm run typecheck
npm test
npx wrangler deploy --dry-run
```

Live release verification should include:

- `https://donezo.mv-builds.com`
- `https://donezo.mv-builds.com/download`
- `https://donezo.mv-builds.com/releases/android/latest.json`
- APK `HEAD`, range support, file size, and SHA-256 hash.

## Live services

- GitHub repo: `https://github.com/ManikantaVenna/donezo-checklist-app`
- Web app: `https://donezo.mv-builds.com`
- Download page: `https://donezo.mv-builds.com/download`
- APK host: `https://downloads.mv-builds.com`
- Current APK: `https://downloads.mv-builds.com/android/Donezo-1.0.7-build-10.apk`
- Supabase project ref: `hymbwzxgrvghvtfnookw`
- Supabase URL: `https://hymbwzxgrvghvtfnookw.supabase.co`
- Resend verified sending domain/subdomain: `mail.mv-builds.com`
- Cloudflare R2 bucket: `donezo-releases`
- Cloudflare Worker: `donezo-release-downloads`
- Cloudflare Worker for reminders: `donezo-reminders`, deployed as a scheduled-only Worker with cron `* * * * *`
- Cloudflare Pages project: `donezo`

## Secrets

- `checklist-app/.env` is gitignored; never commit it.
- `reminder-worker/.dev.vars` is gitignored; use Wrangler/Cloudflare secrets for `SUPABASE_PUBLISHABLE_KEY`, `REMINDER_WORKER_TOKEN`, VAPID private key, and related Worker secrets.
- Signing keys/APKs/AABs/build outputs should remain untracked.
- Do not paste secret keys, passwords, API keys, or signing credentials into chat.
