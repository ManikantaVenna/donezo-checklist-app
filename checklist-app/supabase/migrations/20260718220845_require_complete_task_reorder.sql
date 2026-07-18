-- Require every requested task reorder to succeed.
--
-- The original atomic reorder function ran inside one transaction, but an
-- UPDATE that matched no row (for example, because a task was deleted,
-- archived, or hidden by RLS) was still considered successful by PostgreSQL.
-- That allowed the other requested changes to commit. Checking ROW_COUNT and
-- raising here makes the entire RPC genuinely all-or-nothing.
--
-- This is intentionally a follow-up migration. Do not edit or remove the
-- already-deployed 20260718220112_add_reorder_tasks_function.sql migration.

create or replace function public.reorder_tasks(changes jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  change jsonb;
  change_count integer;
  affected_rows integer;
begin
  if changes is null or jsonb_typeof(changes) <> 'array' then
    raise exception 'changes must be a jsonb array';
  end if;

  change_count := jsonb_array_length(changes);
  if change_count = 0 then
    return;
  end if;
  if change_count > 200 then
    raise exception 'too many reorder changes (%)', change_count;
  end if;

  for change in select * from jsonb_array_elements(changes)
  loop
    if change->>'task_id' is null or change->>'sort_order' is null then
      raise exception 'each change requires task_id and sort_order';
    end if;

    update public.tasks
      set sort_order = (change->>'sort_order')::integer
      where id = (change->>'task_id')::uuid
        and user_id = (select auth.uid())
        and is_archived = false;

    get diagnostics affected_rows = row_count;
    if affected_rows <> 1 then
      raise exception 'one or more tasks could not be reordered'
        using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

-- CREATE OR REPLACE preserves the existing grants, but repeat the intended
-- permissions so this migration remains safe if privileges were changed.
revoke execute on function public.reorder_tasks(jsonb) from public;
revoke execute on function public.reorder_tasks(jsonb) from anon;
grant execute on function public.reorder_tasks(jsonb) to authenticated;
