# Personal Checklist App

Premium personal checklist app for quick tasks, daily routines with streaks, and simple project checklists.

## Run locally

```powershell
npm install
npm run web
```

Without Supabase env values, the app runs in demo mode with mock data.

## Supabase

To connect the app to Supabase, copy `.env.example` to `.env`, replace both placeholder values with real project credentials, and apply `supabase/migrations/20260717000000_initial_schema.sql` to the project.

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Checks

```powershell
npm test
npm run typecheck
npx expo export --platform web --output-dir .expo-web-smoke
```

Use `npm run web` for a manual development-server smoke check.
