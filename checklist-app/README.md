# Personal Checklist App

Premium personal checklist app for quick tasks, daily routines with streaks, and simple project checklists.

## Run locally

```powershell
npm install
cp .env.example .env
npm run web
```

Without Supabase env values, the app runs in demo mode with mock data.

## Supabase

Apply `supabase/migrations/20260717000000_initial_schema.sql` to a Supabase project, then set:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Checks

```powershell
npm test
npm run typecheck
npm run web
```
