-- ==========================================
-- Auto Workshop ERP Schema (Part 2 - Missing Modules)
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 10. Payroll Records
CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    salary_month TEXT NOT NULL, -- Format: YYYY-MM
    base_salary DECIMAL(10,2) DEFAULT 0.00,
    absences_days INTEGER DEFAULT 0,
    bonus_amount DECIMAL(10,2) DEFAULT 0.00,
    status TEXT DEFAULT 'pending', -- 'pending' or 'paid'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(emp_id, salary_month)
);
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access" ON payroll_records FOR ALL TO authenticated USING (true);


-- 11. Point Of Sale (POS Sales)
CREATE TABLE IF NOT EXISTS pos_sales (
    id SERIAL PRIMARY KEY,
    branch_id UUID REFERENCES branches(id),
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL, -- 'كاش' or 'شبكة'
    items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access" ON pos_sales FOR ALL TO authenticated USING (true);


-- 12. Documents Archive (DMS)
CREATE TABLE IF NOT EXISTS documents_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'legal',
    file_type TEXT DEFAULT 'doc',
    file_size TEXT DEFAULT '0 MB',
    file_path TEXT, -- Used for Supabase Storage paths
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE documents_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access" ON documents_archive FOR ALL TO authenticated USING (true);


-- 13. Updates to existing tables for Warranty functionality
ALTER TABLE inspection_reports 
ADD COLUMN IF NOT EXISTS warranty_expiry_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS warranty_status TEXT DEFAULT 'active'; -- 'active', 'expired', 'void'
