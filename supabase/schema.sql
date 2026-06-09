-- ==========================================
-- Auto Workshop ERP Schema
-- ==========================================

-- 1. Enum Types
CREATE TYPE user_role AS ENUM ('Owner', 'Admin', 'Supervisor', 'Receptionist');
CREATE TYPE report_status AS ENUM ('تم الاستلام', 'قيد العمل', 'تم الانتهاء');
CREATE TYPE service_status AS ENUM ('سليم', 'يحتاج صيانة', 'تالف');

-- 2. Branches
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Users (Employees) linked to Supabase Auth
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role user_role DEFAULT 'Receptionist',
    branch_id UUID REFERENCES branches(id),
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Vehicles (Cars)
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    engine_size TEXT,
    plate_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Inspection Reports
CREATE TABLE inspection_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number SERIAL,
    branch_id UUID REFERENCES branches(id),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    receptionist_id UUID REFERENCES employees(id),
    supervisor_id UUID REFERENCES employees(id),
    status report_status DEFAULT 'تم الاستلام',
    odometer_reading INTEGER NOT NULL,
    total_price DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Inventory (Storage)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id),
    item_code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL,
    sell_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7.1 Warehouse Notes
CREATE TABLE warehouse_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Report Services (The 9 core categories checked)
CREATE TABLE report_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES inspection_reports(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- e.g., 'المحرك', 'الكهرباء'
    status service_status NOT NULL,
    notes TEXT,
    service_price DECIMAL(10,2) DEFAULT 0.00,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Used Parts (Linked to Inventory & Reports)
CREATE TABLE used_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES inspection_reports(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES inventory(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to deduct inventory when used_parts is inserted
CREATE OR REPLACE FUNCTION deduct_inventory_on_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventory 
    SET quantity = quantity - NEW.quantity 
    WHERE id = NEW.inventory_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_inventory
AFTER INSERT ON used_parts
FOR EACH ROW EXECUTE FUNCTION deduct_inventory_on_usage();

-- RLS (Row Level Security) Setup
-- Enable access for authenticated users globally for MVP simplicity
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access" ON branches FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON employees FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON vehicles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON inspection_reports FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON inventory FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON report_services FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON used_parts FOR ALL TO authenticated USING (true);

-- Dummy Data for Branches
INSERT INTO branches (name) VALUES 
('الفرع الرئيسي'), 
('فرع القطاع'), 
('فرع الشمال');
