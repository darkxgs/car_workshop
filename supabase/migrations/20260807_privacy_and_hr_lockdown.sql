-- ============================================================================
--  PRIVACY + HR LOCKDOWN  (2026-08-07)
--
--  1. employees: the browser (anon key, authenticated role) could INSERT/UPDATE/
--     DELETE any row — any signed-in user could promote themselves to Admin or
--     delete the Owner's row. Writes now go only through the guarded server
--     actions (service_role bypasses RLS); browsers keep read access, which the
--     app needs for name lists and role lookups.
--
--  2. get_public_booklet: the anon RPC returned the client's FULL phone number
--     (masking happened client-side only) plus internal data buried inside
--     selected_services (pricing internals, per-technician ratings/notes).
--     The function now masks the phone server-side and strips internal keys,
--     keeping exactly what the public page renders.
--
--  Idempotent and safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. employees table: read-only for browser clients.
-- ----------------------------------------------------------------------------
drop policy if exists authenticated_all_access on public.employees;
drop policy if exists employees_read_only on public.employees;
create policy employees_read_only on public.employees
  for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- 2. Public booklet RPC: mask the phone, strip internal payload keys.
--    Kept for the page: is_paper_v2_format, services, freeServices,
--    customServices, shiftSupervisor, technicianName, pricing.accounted.
--    Dropped: technicians (ratings/notes), full pricing, booklet, client id,
--    receptionistName inside the payload, engine color, future odometer.
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
                 else jsonb_build_object(
                   'id', null,
                   'name', c.name,
                   'phone', case
                     when c.phone is null or length(trim(c.phone)) <= 6 then c.phone
                     else left(trim(c.phone), 4) || repeat('*', greatest(length(trim(c.phone)) - 6, 2)) || right(trim(c.phone), 2)
                   end
                 ) end
    ),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'report_number', r.report_number, 'status', r.status,
        'total_price', r.total_price,
        'selected_services',
          case
            when jsonb_typeof(r.selected_services) = 'array'
                 and (r.selected_services->0->>'is_paper_v2_format') = 'true'
            then jsonb_build_array(
              ((r.selected_services->0)
                 - 'technicians' - 'pricing' - 'booklet'
                 - 'receptionistName' - 'engineColorOnReceipt' - 'futureOdometer')
              || jsonb_build_object('pricing', jsonb_build_object(
                   'accounted', coalesce(r.selected_services->0->'pricing'->'accounted', 'false'::jsonb)))
            )
            else coalesce(r.selected_services, '[]'::jsonb)
          end,
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
