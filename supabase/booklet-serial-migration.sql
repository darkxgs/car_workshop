-- Migration: Add booklet_serial column to vehicles and define exec_sql RPC

-- 1. Add booklet_serial column to vehicles table
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS booklet_serial TEXT UNIQUE;

-- 2. Create/Restore the exec_sql RPC function for future dynamic migrations
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql;
    RETURN json_build_object('status', 'success');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$;
