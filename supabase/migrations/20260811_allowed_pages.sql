-- ============================================================================
--  PER-TAB PERMISSIONS  (2026-08-11)
--
--  employees.allowed_pages: jsonb array of sidebar tab keys the employee may
--  see (e.g. ["dashboard","reception","audit"]). NULL = not configured yet →
--  the app falls back to the old boolean permission flags. Owner/Admin always
--  see everything regardless of this column.
--
--  Idempotent and safe to re-run.
-- ============================================================================

alter table public.employees add column if not exists allowed_pages jsonb;
