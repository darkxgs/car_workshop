-- hr-migration.sql
CREATE TABLE IF NOT EXISTS payroll_records (
    id SERIAL PRIMARY KEY,
    emp_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    salary_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    base_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
    absences_days INTEGER NOT NULL DEFAULT 0,
    bonus_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(emp_id, salary_month)
);

CREATE TABLE IF NOT EXISTS documents_archive (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    file_size VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
