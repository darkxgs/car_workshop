-- ============================================================================
--  SECURITY LOCKDOWN MIGRATION  (2026-06-20)
--
--  Fixes two critical exposures found while auditing the production database:
--    1. The `exec_sql` RPC was callable by ANY anonymous visitor, allowing
--       arbitrary SQL execution against the database.
--    2. Row-Level Security was effectively off, so the public anon key (shipped
--       in the browser bundle) could read every table.
--
--  This migration is idempotent and safe to re-run.
--
--  Behaviour preserved: logged-in staff (role = authenticated) keep full access
--  exactly as before; the admin server actions use the service_role key, which
--  bypasses RLS. Only ANONYMOUS / unauthenticated access is removed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Lock down exec_sql  (CRITICAL)
--    Remove arbitrary-SQL execution from public/anon/authenticated. Keep it for
--    service_role so server-side maintenance scripts (which use the service key)
--    continue to work.
-- ----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select oid::regprocedure as sig from pg_proc where proname = 'exec_sql'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated;', r.sig);
    execute format('grant  execute on function %s to service_role;', r.sig);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Enable RLS + an authenticated-only policy on every application table.
--    `using (true) / with check (true)` keeps the *current* app behaviour
--    (any logged-in employee can use the app; per-feature gating stays in the
--    UI) while denying anon. Tightening specific tables (e.g. payroll to Owner)
--    is a recommended follow-up, done separately so it can be tested in isolation.
-- ----------------------------------------------------------------------------
do $$
declare t text; p record;
begin
  foreach t in array array[
    'vehicles','pos_sales','clients','suggestion_lists','employees',
    'documents_archive','branches','inspection_reports','payroll_records',
    'used_parts','inventory_transactions','report_services','workshop_settings',
    'inventory','warehouse_notes'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    -- Drop ALL existing policies on the table. RLS combines policies with OR, so
    -- any pre-existing policy that granted the anon/public role access would keep
    -- the table readable by anonymous users. We clear them and install a single
    -- authenticated-only policy.
    for p in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I;', p.policyname, t);
    end loop;
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true);',
      'authenticated_all_access', t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Public vehicle booklet (QR code) access.
--    Anonymous customers need ONE vehicle + its service reports, looked up by
--    booklet serial — with no direct table access. This SECURITY DEFINER
--    function runs as its owner, so it can read the needed rows while RLS keeps
--    every table closed to anon. The shape mirrors the queries the booklet page
--    previously ran against `vehicles` and `inspection_reports`.
-- ----------------------------------------------------------------------------
create or replace function public.get_public_booklet(p_serial text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when v.id is null then null else jsonb_build_object(
    'vehicle', jsonb_build_object(
      'id', v.id, 'make', v.make, 'model', v.model,
      'plate_number', v.plate_number, 'engine_size', v.engine_size,
      'booklet_serial', v.booklet_serial,
      'clients', case when c.id is null then null
                 else jsonb_build_object('id', c.id, 'name', c.name, 'phone', c.phone) end
    ),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'report_number', r.report_number, 'status', r.status,
        'total_price', r.total_price, 'selected_services', r.selected_services,
        'odometer_reading', r.odometer_reading, 'created_at', r.created_at,
        'branches', case when b.id is null then null else jsonb_build_object('name', b.name) end,
        'receptionist', case when e.id is null then null else jsonb_build_object('name', e.name) end
      ) order by r.created_at desc)
      from inspection_reports r
      left join branches b on b.id = r.branch_id
      left join employees  e on e.id = r.receptionist_id
      where r.vehicle_id = v.id
    ), '[]'::jsonb)
  ) end
  from vehicles v
  left join clients c on c.id = v.client_id
  where v.booklet_serial = p_serial
  limit 1;
$$;

revoke all     on function public.get_public_booklet(text) from public;
grant  execute on function public.get_public_booklet(text) to anon, authenticated;
