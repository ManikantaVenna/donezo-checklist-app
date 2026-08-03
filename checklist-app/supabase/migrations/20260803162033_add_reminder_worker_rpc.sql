create table private.reminder_worker_tokens (
  id smallint primary key default 1 check (id = 1),
  token_hash text not null check (char_length(token_hash) = 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reminder_worker_tokens_updated_at
before update on private.reminder_worker_tokens
for each row execute function private.set_updated_at();

revoke all on table private.reminder_worker_tokens from anon, authenticated;

create or replace function private.is_valid_reminder_worker_token(worker_token text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from private.reminder_worker_tokens
    where id = 1
      and token_hash = encode(extensions.digest(coalesce(worker_token, ''), 'sha256'), 'hex')
  );
$$;

revoke all on function private.is_valid_reminder_worker_token(text) from public;

create or replace function public.get_due_web_push_reminders(
  worker_token text,
  run_at timestamptz default now()
)
returns table (
  subscription_id uuid,
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  timezone text,
  local_date date,
  reminder_time text,
  unfinished_count bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    subscription.id as subscription_id,
    profile.id as user_id,
    subscription.endpoint,
    subscription.p256dh,
    subscription.auth,
    profile.timezone,
    local_time.local_date,
    to_char(preference.reminder_time, 'HH24:MI') as reminder_time,
    unfinished.unfinished_count
  from public.profiles profile
  join public.reminder_preferences preference
    on preference.user_id = profile.id
  join public.web_push_subscriptions subscription
    on subscription.user_id = profile.id
  cross join lateral (
    select
      (run_at at time zone profile.timezone)::date as local_date,
      to_char(run_at at time zone profile.timezone, 'HH24:MI') as local_clock
  ) local_time
  cross join lateral (
    select count(*)::bigint as unfinished_count
    from public.tasks task
    where task.user_id = profile.id
      and task.type = 'daily'
      and task.is_archived = false
      and not exists (
        select 1
        from public.daily_completions completion
        where completion.user_id = profile.id
          and completion.task_id = task.id
          and completion.local_date = local_time.local_date
      )
  ) unfinished
  where private.is_valid_reminder_worker_token(worker_token)
    and preference.enabled = true
    and local_time.local_clock = to_char(preference.reminder_time, 'HH24:MI')
    and unfinished.unfinished_count > 0;
$$;

revoke all on function public.get_due_web_push_reminders(text, timestamptz) from public;
grant execute on function public.get_due_web_push_reminders(text, timestamptz) to anon;

create or replace function public.delete_web_push_subscription(
  worker_token text,
  subscription_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.web_push_subscriptions
  where id = subscription_id
    and private.is_valid_reminder_worker_token(worker_token);
$$;

revoke all on function public.delete_web_push_subscription(text, uuid) from public;
grant execute on function public.delete_web_push_subscription(text, uuid) to anon;
