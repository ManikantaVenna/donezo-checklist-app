create index if not exists tasks_project_user_fk_idx on public.tasks (project_id, user_id);
create index if not exists daily_completions_task_user_fk_idx on public.daily_completions (task_id, user_id);
