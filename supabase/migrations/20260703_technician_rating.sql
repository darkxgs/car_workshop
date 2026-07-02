-- Supervisor's rating of the technician's performance on a work order, plus notes.
-- Additive + nullable, so existing rows are unaffected.
alter table public.inspection_reports
  add column if not exists technician_rating text,
  add column if not exists technician_rating_notes text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'inspection_reports_technician_rating_chk') then
    alter table public.inspection_reports
      add constraint inspection_reports_technician_rating_chk
      check (technician_rating is null or technician_rating in ('رديء','متوسط','جيد','جيد جداً','ممتاز'));
  end if;
end $$;
