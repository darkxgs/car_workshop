-- ============================================================================
--  Add odometer unit (km / mi) to inspection_reports.
--  Additive and idempotent: existing rows default to 'km', so nothing breaks.
-- ============================================================================
alter table public.inspection_reports
  add column if not exists odometer_unit text not null default 'km';

-- Guard the allowed values (km | mi). Drop-then-add so it's re-runnable.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'inspection_reports_odometer_unit_chk'
  ) then
    alter table public.inspection_reports
      add constraint inspection_reports_odometer_unit_chk
      check (odometer_unit in ('km','mi'));
  end if;
end $$;
