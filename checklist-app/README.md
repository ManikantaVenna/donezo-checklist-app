# Donezo

Premium personal checklist app for quick tasks, daily routines with streaks, and simple project checklists.

## Run locally

```powershell
npm install
npm run web
```

Without Supabase env values, the app runs in demo mode with mock data.

Donezo uses passwordless email authentication. New and returning users enter the same email form, receive a 6-digit code, and continue without creating or remembering a password. Supabase persists the session on each device and keeps every user’s checklist data isolated by account.

The sign-in form includes a Remember me option. When enabled, Donezo keeps the user signed in on that device. When disabled, Donezo clears the saved session on the next app/browser restart.

Recommended Supabase Auth settings:

- Authentication > Email Templates > Magic Link: show the 6-digit `{{ .Token }}` instead of `{{ .ConfirmationURL }}`.
- Authentication > Sign In / Providers > Email: keep Email OTP length set to `6`.
- Authentication > URL Configuration: keep the local/dev preview URL allowed, for example `http://localhost:8081`, so reset links can return to the app during testing.
- Authentication > SMTP Settings: use custom SMTP before public launch so emails come from Donezo instead of the default Supabase sender.

## Supabase

To connect the app to Supabase, copy `.env.example` to `.env`, replace both placeholder values with real project credentials, and apply the SQL files in `supabase/migrations/` to the project.

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`

The migration enables row-level security and adds the checklist tables to Supabase Realtime so signed-in devices refresh automatically when tasks, projects, completions, timezone, or reminder settings change.

## Reminders

Daily reset is calculated from the selected timezone. The default is `America/New_York`, and the default reminder is `23:00`.

- Native: schedules the next reminder at the selected timezone's reminder instant when the app is active.
- Web: uses the browser Notification API while the app tab is open and notification permission is granted.

## Checks

```powershell
npm test
npm run typecheck
npx expo export --platform web --output-dir .expo-web-smoke
```

Use `npm run web` for a manual development-server smoke check.
