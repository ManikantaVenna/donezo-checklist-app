create extension if not exists "pgcrypto";

create type public.task_type as enum ('quick', 'daily', 'project');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  type public.task_type not null,
  title text not null check (char_length(trim(title)) between 1 and 240),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_task_requires_project check (
    (type = 'project' and project_id is not null) or
    (type <> 'project' and project_id is null)
  )
);

create table public.daily_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  local_date date not null,
  completed_at timestamptz not null default now(),
  unique (user_id, task_id, local_date)
);

create table public.reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  reminder_time time not null default '23:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger reminder_preferences_updated_at
before update on public.reminder_preferences
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.reminder_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_completions enable row level security;
alter table public.reminder_preferences enable row level security;

create policy "profiles are private"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "projects are private"
on public.projects for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "tasks are private"
on public.tasks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "daily completions are private"
on public.daily_completions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reminder preferences are private"
on public.reminder_preferences for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index projects_user_order_idx on public.projects (user_id, sort_order, created_at);
create index tasks_user_type_order_idx on public.tasks (user_id, type, sort_order, created_at);
create index tasks_project_order_idx on public.tasks (project_id, sort_order, created_at);
create index daily_completions_user_task_date_idx on public.daily_completions (user_id, task_id, local_date desc);
