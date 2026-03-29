"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { UserPlus, Car, Save, Phone, Hash, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function ReceptionPage() {
    const { t } = useLanguage();
    const { user } = useAuth();

    // Form states
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [make, setMake] = useState("");
    const [model, setModel] = useState("");
    const [engineSize, setEngineSize] = useState("");
    const [odometer, setOdometer] = useState("");
    const [plateNumber, setPlateNumber] = useState("");

    // UI states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name || !phone || !make || !model || !odometer || !plateNumber) {
            setError("يرجى تعبئة جميع الحقول المطلوبة (اسم العميل، رقم الهاتف، نوع وموديل السيارة، قراءة العداد، رقم اللوحة)");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // 1. Get Employee & Branch Info
            let branchId = null;
            let employeeId = null;
            
            if (user?.id) {
                const { data: employeeData } = await supabase
                    .from('employees')
                    .select('id, branch_id')
                    .eq('auth_id', user.id)
                    .maybeSingle();
                
                if (employeeData) {
                    employeeId = employeeData.id;
                    branchId = employeeData.branch_id;
                }
            }

            // 2. Handle Client
            let clientId = null;
            const { data: existingClient, error: checkErr } = await supabase
                .from('clients')
                .select('id')
                .eq('phone', phone)
                .maybeSingle();

            if (checkErr) throw checkErr;

            if (existingClient) {
                clientId = existingClient.id;
            } else {
                const { data: newClient, error: clientErr } = await supabase
                    .from('clients')
                    .insert({ name, phone })
                    .select('id')
                    .single();
                
                if (clientErr) throw clientErr;
                if (!newClient) throw new Error("فشل في إنشاء سجل العميل");
                clientId = newClient.id;
            }

            // 3. Handle Vehicle
            const { data: vehicleData, error: vehicleErr } = await supabase
                .from('vehicles')
                .insert({
                    client_id: clientId,
                    make,
                    model,
                    engine_size: engineSize || null,
                    plate_number: plateNumber
                })
                .select('id')
                .single();

            if (vehicleErr) throw vehicleErr;
            if (!vehicleData) throw new Error("فشل في إنشاء سجل المركبة");

            const vehicleId = vehicleData.id;

            // 4. Create Inspection Report
            const { error: reportErr } = await supabase
                .from('inspection_reports')
                .insert({
                    branch_id: branchId,
                    vehicle_id: vehicleId,
                    receptionist_id: employeeId,
                    odometer_reading: parseInt(odometer),
                    status: 'تم الاستلام',
                    total_price: 0
                });

            if (reportErr) throw reportErr;

            // Success: Clean up form
            setSuccess(true);
            setName("");
            setPhone("");
            setMake("");
            setModel("");
            setEngineSize("");
            setOdometer("");
            setPlateNumber("");

        } catch (err: any) {
            console.error("Submission Error:", err);
            setError(err.message || "حدث خطأ غير متوقع أثناء حفظ البيانات");
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setName("");
        setPhone("");
        setMake("");
        setModel("");
        setEngineSize("");
        setOdometer("");
        setPlateNumber("");
        setError(null);
        setSuccess(false);
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8 animate-fade-in" dir={t.common.dashboard === "لوحة التحكم" ? "rtl" : "ltr"}>
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
                    <Car className="text-rose-500" size={32} />
                    استقبال السيارات
                </h1>
                <p className="text-slate-400">
                    أدخل بيانات العميل والسيارة لفتح بوليصة فحص جديدة
                </p>
            </div>

            {/* Error / Success Alerts */}
            {error && (
                <div className="bg-rose-950/40 border border-rose-900/50 rounded-xl p-4 flex gap-3 text-rose-200 animate-slide-up">
                    <AlertCircle className="text-rose-400 shrink-0" size={20} />
                    <p>{error}</p>
                </div>
            )}
            {success && (
                <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-xl p-4 flex gap-3 text-emerald-200 animate-slide-up">
                    <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
                    <p>تم حفظ التقرير بنجاح، وستتحول هذه السيارة الآن لشاشات المهندسين!</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Client Information Form */}
                <div className="glass-card p-6 rounded-2xl relative overflow-hidden group border border-rose-900/20 hover:border-rose-500/40 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -z-10 transition-transform group-hover:scale-150" />
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-rose-500/20 pb-4">
                        <UserPlus className="text-rose-400" size={24} />
                        بيانات العميل
                    </h2>
                    
                    <div className="space-y-5">
                        <div className="space-y-2 relative">
                            <label className="text-sm font-medium text-slate-300 ml-1">اسم العميل <span className="text-rose-500">*</span></label>
                            <input 
                                type="text" 
                                placeholder="مثال: أحمد محمد"
                                className="input-field"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 relative">
                            <label className="text-sm font-medium text-slate-300 ml-1">رقم الهاتف <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" size={18} />
                                <input 
                                    type="tel" 
                                    dir="ltr"
                                    placeholder="+966 5X XXX XXXX"
                                    className="input-field text-right"
                                    style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vehicle Information Form */}
                <div className="glass-card p-6 rounded-2xl relative overflow-hidden group border border-rose-900/20 hover:border-rose-500/40 transition-all duration-300">
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -z-10 transition-transform group-hover:scale-150" />
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-rose-500/20 pb-4">
                        <Car className="text-rose-400" size={24} />
                        بيانات المركبة
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">نوع السيارة <span className="text-rose-500">*</span></label>
                            <input 
                                type="text" 
                                placeholder="مثال: تويوتا"
                                className="input-field"
                                value={make}
                                onChange={(e) => setMake(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">الموديل <span className="text-rose-500">*</span></label>
                            <input 
                                type="text" 
                                placeholder="مثال: كامري 2023"
                                className="input-field"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">حجم المحرك</label>
                            <input 
                                type="text" 
                                placeholder="مثال: 2.5L 4-Cyl"
                                className="input-field"
                                dir="ltr"
                                value={engineSize}
                                onChange={(e) => setEngineSize(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 relative">
                            <label className="text-sm font-medium text-slate-300 ml-1">قراءة العداد (كم) <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold pointer-events-none z-10">KM</span>
                                <input 
                                    type="number" 
                                    dir="ltr"
                                    placeholder="0"
                                    className="input-field text-right"
                                    style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                                    value={odometer}
                                    onChange={(e) => setOdometer(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2 relative">
                            <label className="text-sm font-medium text-slate-300 ml-1">رقم اللوحة <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="أ ب ج - ١٢٣٤"
                                    className="input-field"
                                    style={{ paddingRight: '2.5rem' }}
                                    value={plateNumber}
                                    onChange={(e) => setPlateNumber(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-slate-800">
                <button 
                    type="button" 
                    onClick={handleClear}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-colors border border-slate-700 disabled:opacity-50"
                >
                    إلغاء والتفريغ
                </button>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-rose-600 to-rose-500 text-white font-bold hover:shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all flex items-center gap-2 disabled:opacity-70"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    حفظ وفتح تقرير فحص
                </button>
            </div>
            
            {/* Disclaimer box */}
            <div className="mt-8 bg-black/50 border border-slate-800 rounded-xl p-4 flex gap-3 text-sm text-slate-400 shadow-inner">
                <AlertCircle className="text-rose-500 shrink-0" size={20} />
                <p>
                    هذه الواجهة مربوطة بقاعدة البيانات. بمجرد الضغط على الحفظ يتم فتح بوليصة فحص جديدة في النظام.
                </p>
            </div>
        </form>
    );
}
