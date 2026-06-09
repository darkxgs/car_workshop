-- 1. Add notes column to inventory table
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Create warehouse_notes table
CREATE TABLE IF NOT EXISTS public.warehouse_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ensure "القطاع" branch exists
INSERT INTO public.branches (name, address)
SELECT 'القطاع', 'القطاع'
WHERE NOT EXISTS (
    SELECT 1 FROM public.branches WHERE name = 'القطاع' OR name = 'فرع القطاع'
);

-- 4. Copy inventory structure from 'الصناعية' to 'القطاع'
-- First, get the IDs of the two branches
DO $$
DECLARE
    src_branch_id UUID;
    dest_branch_id UUID;
BEGIN
    -- Get source branch ('الصناعية')
    SELECT id INTO src_branch_id FROM public.branches WHERE name = 'الصناعية' OR name = 'فرع الصناعية' LIMIT 1;
    
    -- Get destination branch ('القطاع')
    SELECT id INTO dest_branch_id FROM public.branches WHERE name = 'القطاع' OR name = 'فرع القطاع' LIMIT 1;

    IF src_branch_id IS NOT NULL AND dest_branch_id IS NOT NULL THEN
        -- Only copy if destination branch has no inventory yet
        IF NOT EXISTS (SELECT 1 FROM public.inventory WHERE branch_id = dest_branch_id) THEN
            INSERT INTO public.inventory (branch_id, name, sku, purchase_price, selling_price, quantity, min_quantity, notes)
            SELECT dest_branch_id, name, sku, purchase_price, selling_price, quantity, min_quantity, notes
            FROM public.inventory
            WHERE branch_id = src_branch_id;
        END IF;
    END IF;
END $$;

