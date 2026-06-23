-- Distinguish a maintenance work order from a direct product sale ("بيع منتج").
-- Sale orders have no technician, so the "finish" lock must skip them.
-- Additive + defaulted, so every existing row stays a 'maintenance' order untouched.
alter table public.inspection_reports
  add column if not exists order_type text not null default 'maintenance';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'inspection_reports_order_type_chk'
  ) then
    alter table public.inspection_reports
      add constraint inspection_reports_order_type_chk
      check (order_type in ('maintenance','sale'));
  end if;
end $$;
