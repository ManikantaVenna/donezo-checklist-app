-- Atomic task reorder.
--
-- The client previously issued one UPDATE per row for a reorder, so a network
-- failure between writes could leave the swap half-applied. This function
-- applies every sort-order change in a single transaction: any failure rolls
-- back all of them.
--
-- Authorization: SECURITY INVOKER, so the caller's row-level security policy
-- ("tasks are private": auth.uid() = user_id) applies to every UPDATE. The
-- explicit user_id predicate is defense in depth; rows the caller does not own
-- simply match nothing. EXECUTE is granted to authenticated users only.
--
-- Rollback: this migration is purely additive. To roll it back, run
--   drop function if exists public.reorder_tasks(jsonb);
-- The app falls back to sequential per-row updates with best-effort
-- compensation when the function is absent (PGRST202), so dropping the
-- function does not break deployed clients.

create or replace function public.reorder_tasks(changes jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  change jsonb;
  change_count integer;
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
  end loop;
end;
$$;

revoke execute on function public.reorder_tasks(jsonb) from public;
revoke execute on function public.reorder_tasks(jsonb) from anon;
grant execute on function public.reorder_tasks(jsonb) to authenticated;
