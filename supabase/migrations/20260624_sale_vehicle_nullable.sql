-- A direct product sale ("بيع منتج") has no vehicle, so a sale order needs a null
-- vehicle_id. Existing maintenance orders already have a vehicle and are unaffected.
alter table public.inspection_reports
  alter column vehicle_id drop not null;
