-- ============================================================
-- AUTO WORKSHOP - WORK ORDER / ERP MIGRATION SCRIPT
-- يرجى تشغيل هذا السكريبت في (Supabase SQL Editor)
-- لتحديث الجداول لدعم خاصية الـ (Live Timer) وأوامر العمل
-- ============================================================

-- 1. إضافة حالات (Status) جديدة لتتبع أمر العمل
-- ملاحظة: إذا تسبب إضافة حالة أخطاء (لأنها موجودة مسبقاً)، يمكنك تخطي هذا السطر.
ALTER TYPE public.report_status ADD VALUE IF NOT EXISTS 'متأخر';
ALTER TYPE public.report_status ADD VALUE IF NOT EXISTS 'ملغى';

-- 2. إضافة أعمدة التتبع الزمني لجدول التقرير (أمر العمل)
ALTER TABLE public.inspection_reports 
    ADD COLUMN IF NOT EXISTS estimated_duration INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS elapsed_time INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS bay_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES public.employees(id),
    ADD COLUMN IF NOT EXISTS selected_services JSONB DEFAULT '[]'::jsonb;
    
-- ملاحظة: أضفنا (selected_services) كـ JSONB لتخزين الخدمات التي اختارها المستخدم 
-- وقت الاستقبال وتفاصيل أوقاتها دون الحاجة لجداول وسيطة معقدة.
