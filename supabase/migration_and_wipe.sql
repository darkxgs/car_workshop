-- 1. Add username and permission columns to employees table if they don't exist
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permission_dashboard BOOLEAN DEFAULT TRUE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permission_reception BOOLEAN DEFAULT TRUE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permission_work_orders BOOLEAN DEFAULT TRUE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permission_customers BOOLEAN DEFAULT TRUE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permission_reports BOOLEAN DEFAULT TRUE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permission_employees BOOLEAN DEFAULT FALSE;

-- 2. Wipe operational tables (inspection_reports, clients, vehicles, report_services, used_parts) and restart sequences
TRUNCATE TABLE public.report_services RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.used_parts RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.inspection_reports RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.vehicles RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.clients RESTART IDENTITY CASCADE;

-- 3. Delete all old employees and auth users to start fresh
DELETE FROM public.employees;
TRUNCATE auth.users CASCADE;
