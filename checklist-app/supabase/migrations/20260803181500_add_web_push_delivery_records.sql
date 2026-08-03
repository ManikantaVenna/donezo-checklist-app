create table private.web_push_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.web_push_subscriptions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  reminder_time time not null,
  status text not null check (status in ('sent', 'failed', 'deleted')),
  status_code integer,
  error_message text,
  attempted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table private.web_push_reminder_deliveries enable row level security;

revoke all on table private.web_push_reminder_deliveries from anon, authenticated;

create index web_push_reminder_deliveries_user_date_idx
on private.web_push_reminder_deliveries (user_id, local_date desc);

create index web_push_reminder_deliveries_subscription_date_idx
on private.web_push_reminder_deliveries (subscription_id, local_date desc);

create unique index web_push_reminder_deliveries_sent_once_idx
on private.web_push_reminder_deliveries (subscription_id, local_date, reminder_time)
where status = 'sent';

drop function if exists public.get_due_web_push_reminders(text, timestamptz);

create or replace function public.get_due_web_push_reminders(
  worker_token text,
  run_at timestamptz default now(),
  lookback_minutes integer default 5
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
  with reminder_window as (
    select make_interval(mins => least(greatest(coalesce(lookback_minutes, 5), 1), 30)) as duration
  )
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
  cross join reminder_window
  cross join lateral (
    select
      (run_at at time zone profile.timezone) as local_now,
      (run_at at time zone profile.timezone)::date as local_date,
      ((run_at at time zone profile.timezone)::date + preference.reminder_time) as local_due_at
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
    and local_time.local_now >= local_time.local_due_at
    and local_time.local_now < local_time.local_due_at + reminder_window.duration
    and unfinished.unfinished_count > 0
    and not exists (
      select 1
      from private.web_push_reminder_deliveries delivery
      where delivery.subscription_id = subscription.id
        and delivery.local_date = local_time.local_date
        and delivery.reminder_time = preference.reminder_time
        and delivery.status = 'sent'
    );
$$;

revoke all on function public.get_due_web_push_reminders(text, timestamptz, integer) from public;
grant execute on function public.get_due_web_push_reminders(text, timestamptz, integer) to anon;

create or replace function public.record_web_push_reminder_delivery(
  worker_token text,
  subscription_id uuid,
  local_date date,
  reminder_time text,
  delivery_status text,
  delivery_status_code integer default null,
  delivery_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_subscription_id uuid := subscription_id;
  target_local_date date := local_date;
  target_reminder_time time := reminder_time::time;
  target_status text := delivery_status;
  target_status_code integer := delivery_status_code;
  target_error_message text := left(delivery_error_message, 500);
  target_user_id uuid;
begin
  if not private.is_valid_reminder_worker_token(worker_token) then
    return;
  end if;

  if target_status not in ('sent', 'failed', 'deleted') then
    raise exception 'invalid delivery status';
  end if;

  select subscription.user_id
  into target_user_id
  from public.web_push_subscriptions subscription
  where subscription.id = target_subscription_id;

  if target_user_id is null then
    return;
  end if;

  insert into private.web_push_reminder_deliveries (
    subscription_id,
    user_id,
    local_date,
    reminder_time,
    status,
    status_code,
    error_message
  )
  values (
    target_subscription_id,
    target_user_id,
    target_local_date,
    target_reminder_time,
    target_status,
    target_status_code,
    target_error_message
  )
  on conflict do nothing;
end;
$$;

revoke all on function public.record_web_push_reminder_delivery(text, uuid, date, text, text, integer, text) from public;
grant execute on function public.record_web_push_reminder_delivery(text, uuid, date, text, text, integer, text) to anon;

notify pgrst, 'reload schema';
