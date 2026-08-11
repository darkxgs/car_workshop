-- ============================================================================
--  HR MODULE — EMPLOYEES + ATTENDANCE  (2026-08-11)
--
--  New standalone HR tables. Deliberately separate from public.employees,
--  which holds LOGIN ACCOUNTS and roles — HR staff records don't need accounts.
--  Extensible: wages, attendance now; leaves/documents later.
--
--  Idempotent and safe to re-run.
-- ============================================================================

create table if not exists public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  full_name text not null,
  photo text,                                   -- small data-URL avatar (client-side downscaled)
  job_title text,
  branch_id uuid references public.branches(id) on delete set null,
  phone text,
  hire_date date,
  status text not null default 'active' check (status in ('active','inactive','leave')),
  wage_type text not null default 'hourly' check (wage_type in ('hourly','daily')),
  wage_rate numeric not null default 0,
  required_monthly_hours numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.hr_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  date date not null,
  check_in time,
  check_out time,
  calculated_hours numeric not null default 0,
  attendance_status text not null default 'حاضر',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, date)
);

create index if not exists hr_attendance_emp_date on public.hr_attendance (employee_id, date desc);
create index if not exists hr_attendance_date on public.hr_attendance (date desc);

-- Same access model as the rest of the app tables: any signed-in employee,
-- nothing for anon. (Page-level gating restricts the UI to Owner/Admin.)
alter table public.hr_employees enable row level security;
alter table public.hr_attendance enable row level security;

drop policy if exists authenticated_all_access on public.hr_employees;
create policy authenticated_all_access on public.hr_employees
  for all to authenticated using (true) with check (true);

drop policy if exists authenticated_all_access on public.hr_attendance;
create policy authenticated_all_access on public.hr_attendance
  for all to authenticated using (true) with check (true);
