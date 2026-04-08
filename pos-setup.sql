-- ============================================================
-- AUTO WORKSHOP - POS INVOICES & SETTINGS
-- يرجى تشغيل هذا السكريبت في (Supabase SQL Editor)
-- لجعل أرقام الفواتير والأرقام الضريبية حقيقية تتسلسل أوتوماتيكياً
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pos_sales (
    id SERIAL PRIMARY KEY, -- رقم الفاتورة الحقيقي والمتسلسل
    total_amount NUMERIC NOT NULL,
    payment_method VARCHAR(50),
    items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workshop_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL
);

-- إدخال رقم ضريبي مبدئي (يمكن للمدير تغييره لاحقاً)
INSERT INTO public.workshop_settings (setting_key, setting_value) 
VALUES ('tax_number', '300480000000003') 
ON CONFLICT (setting_key) DO NOTHING;
