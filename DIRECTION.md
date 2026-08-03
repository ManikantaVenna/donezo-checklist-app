# DIRECTION.md - Donezo Direction

## Purpose

Donezo is a premium personal checklist app: quick tasks, daily routines, streaks,
simple projects, and private sync across web and Android using the same account.
It should feel fast, calm, premium, dark/gold, and simple enough that people are
not afraid to use it.

## Standing product decisions

- App name is **Donezo**.
- Visual identity is premium dark/gold with a shiny Donezo logo.
- The app should remain simple and smooth; avoid unnecessary complexity.
- Web browser version matters because people can try it safely without installing an APK.
- Android APK download page matters because current distribution is outside Play Store.
- Native iPhone distribution is deferred because the US path requires Apple Developer Program/TestFlight/App Store; use PWA/Home Screen web reminders first.
- Supabase remains the backend for auth, sync, and per-user data separation.
- Auth uses email code verification; do not ask users to manage passwords unless the user changes direction.
- Do not ask Manikanta to paste secret keys/passwords/API keys into chat.
- Default timezone is New York; default reminder is 11 PM.
- The project is public on GitHub, but secrets/build artifacts/signing keys must stay untracked.
- Public GitHub attribution should show Manikanta only; do not add AI co-author trailers.

## Release decisions

- Current Android release flow uses EAS for signed APKs.
- APK files are hosted through Cloudflare R2 behind the Worker at `downloads.mv-builds.com`.
- Web/download site is hosted at `donezo.mv-builds.com`.
- `checklist-app/public/releases/android/latest.json` is the update manifest.
- When the user says a change is "good", "final", "ship it", or "make public", treat it as a release request unless they say local-only/no build/no publish.
- Release order matters:
  1. Build signed APK.
  2. Upload APK.
  3. Verify APK URL/size/hash/range support.
  4. Deploy web/download site.
  5. Publish `latest.json` last.
- Never tell the user friends will get an update prompt until the APK and live manifest are verified.

## Quality decisions

- Prioritize speed and smoothness inside the app.
- Optimistic UI is intentional for add/toggle/delete/reorder.
- Avoid broad rewrites when a narrow fix works.
- Run tests/typecheck before claiming fixes are complete.
- For Supabase/database work, preserve RLS and user data separation.
- For Cloudflare/R2 work, avoid anything that could create unexpected billing or public bucket exposure.

## Memory classification

- Rule/decision/rationale -> this file.
- Current state/verification/next task -> `CURRENT.md`.
- File/service map -> `INDEX.md`.
- Detailed design -> `docs/superpowers/specs/`.
- Implementation plan -> `docs/superpowers/plans/`.

## Rejected or deferred

- Do not move to Play Store automatically; current distribution is web page + APK unless the user asks for Play Store release.
- Do not move to native iOS/TestFlight/App Store while Manikanta does not want to pay for Apple Developer Program membership.
- Do not restart Donezo from scratch.
- Do not use the mobile-design workflow unless the user explicitly asks.
- Do not assume failed email delivery is an app-code bug without checking Resend logs.
- Do not rely on old chat history as the source of truth; update and commit files.

## History summary

- Built Donezo locally from the checklist app worktree.
- Connected Supabase Auth/Postgres/Realtime and created schema/RLS/migrations.
- Set up custom SMTP through Resend after verifying domain `mail.mv-builds.com`.
- Changed Supabase email template to send `{{ .Token }}` code instead of confirmation link.
- Simplified auth direction toward email code login.
- Created Expo/EAS Android project and Android APK builds.
- Fixed Android safe-area/navigation-button issues.
- Fixed Supabase sync races and task flicker with optimistic reconciliation.
- Added atomic reorder RPC migration.
- Added local reminders, timezone display fixes, and release/update checks.
- Designed and implemented premium streak badge tiers and images.
- Built permanent download infrastructure with Cloudflare Pages, R2, and Worker.
- Published Donezo `1.0.7` build `10`.
- Created public GitHub repo and pushed the project.
- Cleaned GitHub co-author metadata so public attribution is Manikanta only.
- Added project continuity files so future chats can resume cleanly.
- Added and deployed PWA Web Push reminders as the no-Apple-fee iPhone path.
