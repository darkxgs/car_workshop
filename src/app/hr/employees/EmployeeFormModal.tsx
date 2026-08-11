"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { showError, showSuccess } from "@/lib/alerts";
import { HrEmployee, fileToAvatarDataUrl } from "@/lib/hr";
import { X, Camera, Loader2, User } from "lucide-react";

type Props = {
    employee: HrEmployee | null;               // null = add new
    branches: { id: string; name: string }[];
    onClose: () => void;
    onSaved: () => void;
};

const inputCls = "w-full bg-muted border border-border rounded-xl p-3 text-foreground focus:border-rose-500 focus:outline-none transition-colors";
const labelCls = "block text-sm font-bold text-muted-foreground mb-2";

export default function EmployeeFormModal({ employee, branches, onClose, onSaved }: Props) {
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        full_name: employee?.full_name || "",
        employee_code: employee?.employee_code || "",
        photo: employee?.photo || "",
        job_title: employee?.job_title || "",
        branch_id: employee?.branch_id || "",
        phone: employee?.phone || "",
        hire_date: employee?.hire_date || "",
        status: employee?.status || "active",
        wage_type: employee?.wage_type || "hourly",
        wage_rate: employee ? String(employee.wage_rate || "") : "",
        required_monthly_hours: employee ? String(employee.required_monthly_hours || "") : "",
    });

    const set = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }));

    const pickPhoto = async (file: File | undefined) => {
        if (!file) return;
        try {
            const dataUrl = await fileToAvatarDataUrl(file);
            set("photo", dataUrl);
        } catch {
            showError("خطأ", "تعذّر قراءة الصورة — جرّب صورة أخرى.");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.full_name.trim()) return showError("تنبيه", "اسم الموظف مطلوب.");
        if (!form.employee_code.trim()) return showError("تنبيه", "الرقم الوظيفي مطلوب.");

        setSaving(true);
        const payload = {
            full_name: form.full_name.trim(),
            employee_code: form.employee_code.trim(),
            photo: form.photo || null,
            job_title: form.job_title.trim() || null,
            branch_id: form.branch_id || null,
            phone: form.phone.trim() || null,
            hire_date: form.hire_date || null,
            status: form.status,
            wage_type: form.wage_type,
            wage_rate: parseFloat(form.wage_rate) || 0,
            required_monthly_hours: parseFloat(form.required_monthly_hours) || 0,
        };

        const { error } = employee
            ? await (supabase as any).from("hr_employees").update(payload).eq("id", employee.id)
            : await (supabase as any).from("hr_employees").insert([payload]);
        setSaving(false);

        if (error) {
            showError("خطأ", error.code === "23505"
                ? "الرقم الوظيفي مستخدم لموظف آخر — اختر رقماً مختلفاً."
                : error.message || "حدث خطأ أثناء الحفظ.");
            return;
        }
        showSuccess("تم الحفظ", employee ? "تم تحديث بيانات الموظف." : "تمت إضافة الموظف بنجاح.");
        onSaved();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
            <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/50 rounded-t-2xl sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-foreground">{employee ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-5 font-ibm">
                    {/* Photo picker */}
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => fileRef.current?.click()}
                            className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center group shrink-0">
                            {form.photo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={form.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User size={30} className="text-muted-foreground" />
                            )}
                            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera size={20} className="text-white" />
                            </span>
                        </button>
                        <div>
                            <p className="text-sm font-bold text-foreground">صورة الموظف</p>
                            <p className="text-xs text-muted-foreground">اضغط على الدائرة لاختيار صورة (اختياري)</p>
                            {form.photo && (
                                <button type="button" onClick={() => set("photo", "")} className="text-xs text-rose-500 hover:text-rose-400 mt-1">إزالة الصورة</button>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden"
                            onChange={e => pickPhoto(e.target.files?.[0])} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>الاسم الكامل <span className="text-rose-500">*</span></label>
                            <input required value={form.full_name} onChange={e => set("full_name", e.target.value)} className={inputCls} placeholder="محمد صالح العبدالله" />
                        </div>
                        <div>
                            <label className={labelCls}>الرقم الوظيفي <span className="text-rose-500">*</span></label>
                            <input required value={form.employee_code} onChange={e => set("employee_code", e.target.value)} className={`${inputCls} font-mono`} placeholder="EMP-001" dir="ltr" />
                        </div>
                        <div>
                            <label className={labelCls}>الاختصاص / المسمى الوظيفي</label>
                            <input value={form.job_title} onChange={e => set("job_title", e.target.value)} className={inputCls} placeholder="فني ميكانيك" />
                        </div>
                        <div>
                            <label className={labelCls}>الفرع</label>
                            <select value={form.branch_id} onChange={e => set("branch_id", e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                                <option value="">بدون فرع</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>رقم الهاتف</label>
                            <input value={form.phone} onChange={e => set("phone", e.target.value)} type="tel" className={`${inputCls} font-mono`} placeholder="07XXXXXXXXX" dir="ltr" />
                        </div>
                        <div>
                            <label className={labelCls}>تاريخ المباشرة</label>
                            <input value={form.hire_date} onChange={e => set("hire_date", e.target.value)} type="date" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>حالة الموظف</label>
                            <select value={form.status} onChange={e => set("status", e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                                <option value="active">فعال</option>
                                <option value="leave">إجازة</option>
                                <option value="inactive">متوقف</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>نوع الأجر</label>
                            <select value={form.wage_type} onChange={e => set("wage_type", e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                                <option value="hourly">بالساعة</option>
                                <option value="daily">باليومية</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>قيمة الأجر (د.ع) — {form.wage_type === "hourly" ? "لكل ساعة" : "لكل يوم"}</label>
                            <input value={form.wage_rate} onChange={e => set("wage_rate", e.target.value)} type="number" min="0" step="any" className={`${inputCls} font-mono`} placeholder="0" dir="ltr" />
                        </div>
                        <div>
                            <label className={labelCls}>الساعات الشهرية المطلوبة</label>
                            <input value={form.required_monthly_hours} onChange={e => set("required_monthly_hours", e.target.value)} type="number" min="0" step="any" className={`${inputCls} font-mono`} placeholder="240" dir="ltr" />
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button type="submit" disabled={saving}
                            className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2">
                            {saving ? (<><Loader2 className="animate-spin" size={18} /> جاري الحفظ...</>) : employee ? "حفظ التعديلات" : "إضافة الموظف"}
                        </button>
                        <button type="button" onClick={onClose}
                            className="flex-1 bg-muted hover:bg-slate-300 dark:hover:bg-slate-700 border border-border text-foreground py-3 rounded-xl font-bold transition-colors">
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
