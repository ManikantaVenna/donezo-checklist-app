create table public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(trim(endpoint)) > 0),
  p256dh text not null check (char_length(trim(p256dh)) > 0),
  auth text not null check (char_length(trim(auth)) > 0),
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger web_push_subscriptions_updated_at
before update on public.web_push_subscriptions
for each row execute function private.set_updated_at();

alter table public.web_push_subscriptions enable row level security;

create policy "web push subscriptions are private"
on public.web_push_subscriptions for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.web_push_subscriptions to authenticated;

create index web_push_subscriptions_user_idx on public.web_push_subscriptions (user_id);
