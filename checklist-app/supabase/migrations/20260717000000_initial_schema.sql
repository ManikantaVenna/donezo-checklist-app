create extension if not exists "pgcrypto";

create type public.task_type as enum ('quick', 'daily', 'project');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/New_York',
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
  updated_at timestamptz not null default now(),
  constraint projects_id_user_id_key unique (id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
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
  ),
  constraint tasks_project_user_id_fkey foreign key (project_id, user_id)
    references public.projects (id, user_id) on delete cascade,
  constraint tasks_id_user_id_key unique (id, user_id)
);

create table public.daily_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  local_date date not null,
  completed_at timestamptz not null default now(),
  unique (user_id, task_id, local_date),
  constraint daily_completions_task_user_id_fkey foreign key (task_id, user_id)
    references public.tasks (id, user_id) on delete cascade
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
set search_path = ''
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
set search_path = ''
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

alter table public.profiles replica identity full;
alter table public.projects replica identity full;
alter table public.tasks replica identity full;
alter table public.daily_completions replica identity full;
alter table public.reminder_preferences replica identity full;

alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.daily_completions;
alter publication supabase_realtime add table public.reminder_preferences;
