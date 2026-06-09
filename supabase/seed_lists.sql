DO $$
DECLARE
    ind_branch_id UUID;
    sec_branch_id UUID;
BEGIN
    -- Get branch IDs
    SELECT id INTO ind_branch_id FROM public.branches WHERE name IN ('الصناعية', 'فرع الصناعية') LIMIT 1;
    SELECT id INTO sec_branch_id FROM public.branches WHERE name IN ('القطاع', 'فرع القطاع') LIMIT 1;

    IF ind_branch_id IS NOT NULL THEN
        -- Insert Reception Staff (الصناعية)
        INSERT INTO public.employees (name, role, branch_id)
        SELECT name, 'Receptionist', ind_branch_id FROM (VALUES ('علي صلاح'), ('علي حافظ')) AS v(name)
        WHERE NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.name = v.name AND e.branch_id = ind_branch_id AND e.role = 'Receptionist');

        -- Update Supervisors (الصناعية)
        INSERT INTO public.suggestion_lists (key, label, branch_id, items)
        VALUES ('supervisorNames', 'أسماء المشرفين', ind_branch_id, '["بودي", "حيدر كريم", "خالد السيد"]'::jsonb)
        ON CONFLICT (key, branch_id) DO UPDATE SET items = EXCLUDED.items, label = EXCLUDED.label;

        -- Update Technicians (الصناعية)
        INSERT INTO public.suggestion_lists (key, label, branch_id, items)
        VALUES ('technicianNames', 'أسماء الفنيين', ind_branch_id, '["حيدر حنون", "عباس عجل", "حسين قلعة", "ويني", "علي عباس الحداد", "عقيل الحداد", "مرتضى الحداد", "حسن"]'::jsonb)
        ON CONFLICT (key, branch_id) DO UPDATE SET items = EXCLUDED.items, label = EXCLUDED.label;
    END IF;

    IF sec_branch_id IS NOT NULL THEN
        -- Insert Reception Staff (القطاع)
        INSERT INTO public.employees (name, role, branch_id)
        SELECT name, 'Receptionist', sec_branch_id FROM (VALUES ('حيدر علي'), ('مجتبى صلاح')) AS v(name)
        WHERE NOT EXISTS (SELECT 1 FROM public.employees e WHERE e.name = v.name AND e.branch_id = sec_branch_id AND e.role = 'Receptionist');

        -- Update Supervisors (القطاع)
        INSERT INTO public.suggestion_lists (key, label, branch_id, items)
        VALUES ('supervisorNames', 'أسماء المشرفين', sec_branch_id, '["عباس طالب", "اسماعيل"]'::jsonb)
        ON CONFLICT (key, branch_id) DO UPDATE SET items = EXCLUDED.items, label = EXCLUDED.label;

        -- Update Technicians (القطاع)
        INSERT INTO public.suggestion_lists (key, label, branch_id, items)
        VALUES ('technicianNames', 'أسماء الفنيين', sec_branch_id, '["علي مزهر", "صادق", "عباس حيدر", "يعلي حيدر", "عباس جبار", "ابو زهراء", "مصطفى سلام", "علي هيثم", "احمد عدنان"]'::jsonb)
        ON CONFLICT (key, branch_id) DO UPDATE SET items = EXCLUDED.items, label = EXCLUDED.label;
    END IF;
END $$;
