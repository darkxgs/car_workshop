-- Read-only query function for the AI assistant. Defense in depth:
--  1. Must start with SELECT or WITH.
--  2. Wrapped as `select * from (<query>) sub` — Postgres only allows a
--     SELECT-returning statement there, so INSERT/UPDATE/DELETE/DDL (and
--     data-modifying CTEs, which are top-level only) error instead of running.
--  3. A short statement_timeout and a hard row cap.
--  4. Executable by service_role only (the server route runs as service_role
--     after requireAdmin()); revoked from anon/authenticated/public.
create or replace function public.assistant_query(query_text text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if query_text !~* '^\s*(select|with)\s' then
    raise exception 'Only read-only SELECT/WITH queries are allowed.';
  end if;
  if query_text ~* '\m(insert|update|delete|drop|alter|truncate|grant|revoke|create|comment|merge|vacuum|refresh|call|copy|reindex|cluster|attach|detach)\M' then
    raise exception 'Only read-only queries are allowed.';
  end if;

  set local statement_timeout = '10s';
  execute format(
    'select coalesce(json_agg(t), ''[]''::json) from (select * from (%s) sub limit 1000) t',
    query_text
  ) into result;
  return result;
end;
$$;

revoke all on function public.assistant_query(text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.assistant_query(text) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.assistant_query(text) from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.assistant_query(text) to service_role';
  end if;
end $$;
