# PWA Reminders Design

## Goal

Make Donezo reminders reliable for Apple users without paying for Apple Developer Program distribution by supporting installable web app reminders through Web Push, while keeping Android/native reminders exact to each user's selected timezone and reminder time.

## Product Rules

- Do not build or distribute a native iOS app for this change.
- Do not ask Manikanta to paste secrets in chat.
- Do not use the mobile-design workflow.
- Do not restart or replace Donezo.
- Reminders must only be sent when reminders are enabled and at least one active daily routine is unfinished for the user's current local date.
- Reminder time is interpreted in the user's saved IANA timezone, such as `America/New_York` or `Asia/Kolkata`.
- If all daily routines are complete before the reminder minute, no reminder should be sent.

## Architecture

Donezo keeps native reminders for Android/iOS app builds through `expo-notifications`, but changes the scheduling guard so the next native reminder is not scheduled when the unfinished daily count is zero. The existing timezone calculation remains the source of truth for the exact local reminder instant.

For web users, Donezo becomes a proper PWA reminder client. The web app registers a service worker, exposes a notification setup action in Settings, requests notification permission only from a user tap, subscribes with the Push API using a public VAPID key, and stores the subscription in Supabase under the signed-in user.

A new Cloudflare Worker runs every minute. It uses a Supabase publishable key plus a private worker token stored as Cloudflare secrets, calls token-guarded Supabase RPCs, filters by each user's saved timezone and reminder time, checks active daily routines for that user's local date, and sends Web Push only when unfinished routines exist. Dead subscriptions are removed after push services return `404` or `410`.

## Data Model

Create `public.web_push_subscriptions`:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `endpoint text not null unique`
- `p256dh text not null`
- `auth text not null`
- `user_agent text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS is enabled. Authenticated users can select, insert, update, and delete only their own subscription rows. The scheduled Worker uses token-guarded `SECURITY DEFINER` RPCs with a private token hash stored in the `private` schema; no service-role key is exposed to the browser or stored in Worker secrets.

## UX

Settings gets a web-only reminder setup panel:

- Shows whether the browser supports service workers, Push API, and Notification permission.
- Tells iPhone users to add Donezo to Home Screen and open it from the Home Screen icon for reliable web reminders.
- Provides one clear button to enable web reminders.
- Shows permission/subscription status and a concise error if the browser blocks notifications.

Existing reminder/timezone controls remain. The copy should make clear that the reminder follows the selected timezone.

## Testing

- Unit tests cover native scheduling cancellation when no daily routines are unfinished.
- Unit tests cover web subscription payload normalization.
- Repository tests cover saving and deleting web push subscriptions.
- Worker tests cover exact timezone matching, unfinished daily filtering, and dead subscription deletion.
- Typecheck and app tests must pass before claiming the change is complete.

## Deployment Notes

This change is not live for users until:

- Supabase migration is applied.
- Web app is deployed.
- Worker secrets are configured outside chat.
- Reminder Worker is deployed with its cron trigger.
- A new Android release is prepared if the user asks to ship app changes publicly.
