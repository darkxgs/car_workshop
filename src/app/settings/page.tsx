"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Settings, Users, Building2, MapPin, Save, MessageCircle, Plus, Loader2, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabase";
import { createEmployeeAccount } from "@/app/actions/admin";
import { UserRole } from "@/lib/types";

export default function SettingsPage() {
    const { t } = useLanguage();
    const { employeeRole, loading: authLoading } = useAuth();
    
    // Auth & Employees State
    const [employees, setEmployees] = useState<any[]>([]);
    const [loadingEnv, setLoadingEnv] = useState(true);

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "Receptionist" as UserRole
    });

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data) setEmployees(data);
            else if (error) console.error("Failed to fetch employees:", error);
        } catch (e) {
            console.error("Exception fetching employees:", e);
        } finally {
            setLoadingEnv(false);
        }
    };

    useEffect(() => {
        // Wait until role has been resolved before fetching
        if (employeeRole === null) return; // still loading
        if (employeeRole === "Admin" || employeeRole === "Owner") {
            fetchEmployees();
        } else {
            setLoadingEnv(false);
        }
    }, [employeeRole]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError(null);

        const res = await createEmployeeAccount(formData);
        
        if (res.success) {
            setIsAddModalOpen(false);
            setFormData({ name: "", email: "", phone: "", password: "", role: "Receptionist" });
            // Immediately re-fetch to show the new employee without manual refresh
            await fetchEmployees();
        } else {
            setFormError(res.error || "فشل في إنشاء الحساب. لعل البريد الإلكتروني مستخدم مسبقاً.");
        }
        
        setIsSubmitting(false);
    };

    if (authLoading || loadingEnv) {
        return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-rose-500 w-10 h-10" /></div>;
    }

    if (employeeRole !== "Admin" && employeeRole !== "Owner") {
        return (
            <div className="p-8 flex items-center justify-center min-h-[50vh] animate-fade-in" dir="rtl">
                <div className="glass-card p-8 rounded-2xl border-rose-900/40 text-center max-w-md w-full relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rose-500/10 blur-[50px] rounded-full pointer-events-none" />
                    <AlertCircle className="mx-auto text-rose-500 mb-4 relative z-10" size={48} />
                    <h2 className="text-2xl font-bold text-white mb-2 relative z-10">غير مصرح لك</h2>
                    <p className="text-slate-400 relative z-10">عذراً، صفحة الإعدادات وصلاحيات الموظفين مخصصة للإدارة العليا فقط.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in pb-24" dir={t.common.dashboard === "لوحة التحكم" ? "rtl" : "ltr"}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
                        <Settings className="text-rose-500" size={32} />
                        الإعدادات
                    </h1>
                    <p className="text-slate-400">
                        إدارة الفروع وصلاحيات المستخدمين والرسائل الآلية
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Branches Settings */}
                <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-rose-500/20 pb-4">
                        <Building2 className="text-rose-400" size={24} />
                        إعدادات الفروع
                    </h2>
                    
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold">الفرع الرئيسي</h4>
                                    <p className="text-xs text-slate-400">الرياض - شارع التحلية</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs border border-emerald-500/20">نشط</span>
                        </div>
                        <button className="w-full py-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium">
                            + إضافة فرع جديد
                        </button>
                    </div>
                </div>

                {/* WhatsApp Integration API */}
                <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-blue-500/20 pb-4">
                        <MessageCircle className="text-blue-400" size={24} />
                        ربط واتساب API (WhatsApp)
                    </h2>
                    
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">مفتاح الربط (API Key)</label>
                            <input 
                                type="password" 
                                placeholder="************************"
                                className="input-field text-left"
                                dir="ltr"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">رسالة الترحيب الآلية</label>
                            <textarea 
                                placeholder="مرحباً [الاسم]، تم استلام سيارتك [النوع] وجاري العمل عليها..."
                                className="input-field min-h-[100px] text-sm resize-none"
                            />
                        </div>
                        <button className="w-full py-2.5 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition flex items-center justify-center gap-2 border border-slate-700">
                            <Save size={18} /> حفظ إعدادات الرسائل
                        </button>
                    </div>
                </div>

                {/* Users Management */}
                <div className="glass-card p-6 rounded-2xl md:col-span-2">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-700 pb-4">
                        <Users className="text-cyan-400" size={24} />
                        إدارة المستخدمين
                    </h2>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/30">
                                    <th className="py-3 px-4 font-medium">الاسم</th>
                                    <th className="py-3 px-4 font-medium">المنصب (Role)</th>
                                    <th className="py-3 px-4 font-medium">رقم الهاتف</th>
                                    <th className="py-3 px-4 font-medium">تاريخ الإنضمام</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                        <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 font-mono text-xs">{emp.name.charAt(0)}</div>
                                            {emp.name}
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`px-2 py-1 rounded-md text-xs border ${
                                                emp.role === 'Admin' || emp.role === 'Owner' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                                                emp.role === 'Supervisor' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                            }`}>
                                                {emp.role}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-slate-300 font-mono" dir="ltr">{emp.phone || '-'}</td>
                                        <td className="py-4 px-4 text-slate-400 font-mono">{new Date(emp.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {employees.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-slate-500 font-bold">لم يتم العثور على أي موظف مسجل!</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-5 py-2.5 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 font-bold rounded-xl transition flex items-center gap-2"
                        >
                            <Plus size={18} /> إضافة عضو جديد
                        </button>
                    </div>
                </div>
            </div>

            {/* ADD EMPLOYEE MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" dir="rtl">
                    <form onSubmit={handleCreateUser} className="bg-[#050505] border border-cyan-900/40 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col animate-slide-up relative">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 bg-gradient-to-l from-slate-900 to-[#050505] flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Users className="text-cyan-500" /> إضافة موظف جديد
                            </h2>
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white bg-[#111] p-1.5 rounded-lg border border-slate-800">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="p-6 space-y-4 overflow-y-auto w-full">
                            {formError && (
                                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 p-3 rounded-xl text-sm flex gap-2">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <label htmlFor="emp-name" className="text-sm font-medium text-slate-300">الاسم الكامل</label>
                                <input id="emp-name" name="name" required type="text" className="input-field" placeholder="مثال: أحمد عبد الله" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="emp-email" className="text-sm font-medium text-slate-300">البريد الإلكتروني (لتسجيل الدخول)</label>
                                <input id="emp-email" name="email" required type="email" className="input-field" dir="ltr" placeholder="employee@autoworkshop.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="emp-password" className="text-sm font-medium text-slate-300">كلمة المرور المشفرة</label>
                                <input id="emp-password" name="password" required minLength={6} type="password" autoComplete="new-password" className="input-field font-mono text-left tracking-widest" dir="ltr" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="emp-role" className="text-sm font-medium text-slate-300">المنصب والصلاحية</label>
                                    <select id="emp-role" name="role" className="input-field font-bold text-cyan-400 bg-cyan-950/20 border-cyan-900/50" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                                        <option value="Receptionist">موظف استقبال</option>
                                        <option value="Supervisor">مشرف فني (ورشة)</option>
                                        <option value="Admin">مدير عام (أقصى صلاحية)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="emp-phone" className="text-sm font-medium text-slate-300">رقم التواصل</label>
                                    <input id="emp-phone" name="phone" type="text" className="input-field" dir="ltr" placeholder="+964..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-800 bg-[#0a0a0a] flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 rounded-xl text-slate-300 hover:bg-[#111] transition-colors font-medium">إلغاء</button>
                            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} صناعة الحساب
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
